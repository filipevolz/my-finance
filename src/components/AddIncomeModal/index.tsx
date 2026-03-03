import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { incomesService } from '../../services/incomes.service';
import type {
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from '../../services/incomes.service';
import { categoriesService } from '../../services/categories.service';
import type { Category, CategoryType } from '../../services/categories.service';
import { IconRenderer } from '../../utils/iconMapper';
import { CategorySelectItemContent } from './styles';
import {
  ModalForm,
  FormGroup,
  FormRow,
  CheckboxGroup,
  CheckboxLabel,
  ErrorMessage,
  SubmitButton,
  StyledInput,
  StyledDialogContent,
  StyledDialogHeader,
  StyledDialogTitle,
  StyledDialogDescription,
  StyledLabel,
  StyledDialogClose,
} from './styles';

const incomeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine(
      (val) => {
        // Remove R$, espaços e pontos, mantém apenas números e vírgula
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const numValue = parseFloat(cleaned);
        return !isNaN(numValue) && numValue > 0 && numValue >= 0.01;
      },
      { message: 'Valor deve ser maior que zero e no mínimo R$ 0,01' },
    ),
  date: z.date(),
  isRecurring: z.boolean(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface AddIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  incomeId?: string | null;
}

export function AddIncomeModal({
  open,
  onOpenChange,
  onSuccess,
  incomeId,
}: AddIncomeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const isEditing = !!incomeId;

  useEffect(() => {
    if (open) {
      setIsLoadingCategories(true);
      void categoriesService
        .findAll('income' as CategoryType)
        .then((response) => setCategories(response.data))
        .catch(() => setCategories([]))
        .finally(() => setIsLoadingCategories(false));
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      category: '',
      amount: '',
      date: new Date(),
      isRecurring: false,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) return;
  
    // editar
    if (incomeId && !isLoadingCategories && categories.length > 0) {
      void incomesService
        .findOne(incomeId)
        .then((response) => {
          const income = response.data;
  
          // Corrige problema de timezone
          const dateStr = income.date.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const incomeDate = new Date(year, month - 1, day);
  
          reset({
            name: income.name || '',
            category: income.category,
            amount: new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(income.amount / 100),
            date: incomeDate,
            isRecurring: income.isRecurring ?? false,
          });
        })
        .catch(() => {
          setError('Erro ao carregar receita');
        });
    }
  
    // criar
    if (!incomeId && !isLoadingCategories) {
      reset({
        name: '',
        category: '',
        amount: '',
        date: new Date(),
        isRecurring: false,
      });
    }
  }, [open, incomeId, reset, isLoadingCategories, categories.length]);

  const onSubmit = async (data: IncomeFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Converter valor formatado (R$ 3.000,00) para centavos
      // Remove R$, espaços e pontos (separadores de milhar), substitui vírgula por ponto
      const cleanedAmount = data.amount
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const numericAmount = parseFloat(cleanedAmount);
      // Converter reais para centavos (multiplicar por 100)
      const amountInCents = Math.round(numericAmount * 100);

      if (isEditing && incomeId) {
        const requestData: UpdateIncomeRequest = {
          name: data.name || undefined,
          category: data.category,
          amount: amountInCents,
          date: format(data.date, 'yyyy-MM-dd'),
        };
        await incomesService.update(incomeId, requestData);
      } else {
        const requestData: CreateIncomeRequest = {
          name: data.name || undefined,
          category: data.category,
          amount: amountInCents,
          date: format(data.date, 'yyyy-MM-dd'),
          isRecurring: data.isRecurring,
        };
        await incomesService.create(requestData);
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erro ao criar receita');
      } else {
        setError('Erro ao criar receita. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <StyledDialogContent>
          <StyledDialogClose aria-label="Fechar">
            <X size={20} />
          </StyledDialogClose>
          <StyledDialogHeader>
            <StyledDialogTitle>
              {isEditing ? 'Editar Receita' : 'Adicionar Receita'}
            </StyledDialogTitle>
            <StyledDialogDescription>
              {isEditing
                ? 'Atualize os dados da receita.'
                : 'Preencha os dados da receita.'} Você pode criar uma receita única ou
              recorrente (12 meses).
            </StyledDialogDescription>
          </StyledDialogHeader>
          <ModalForm onSubmit={handleSubmit(onSubmit)}>
            <FormGroup>
              <StyledLabel htmlFor="name">Nome da receita</StyledLabel>
              <StyledInput
                id="name"
                type="text"
                placeholder="Nome da receita"
                {...register('name')}
              />
              {errors.name && (
                <ErrorMessage>{errors.name.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <StyledLabel htmlFor="category">
                Categoria <span aria-label="obrigatório">*</span>
              </StyledLabel>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      id="category"
                      className="w-full py-5"
                      aria-invalid={!!errors.category}
                    >
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          <CategorySelectItemContent>
                            <IconRenderer
                              iconName={category.icon}
                              size={16}
                              fallback={null}
                            />
                            {category.name}
                          </CategorySelectItemContent>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <ErrorMessage>{errors.category.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormRow>
              <FormGroup>
                <StyledLabel htmlFor="amount">
                  Valor <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => {
                    const handleChange = (
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      const input = e.target;
                      const value = e.target.value;

                      // Remove tudo exceto números
                      const numbers = value.replace(/\D/g, '');

                      if (!numbers) {
                        field.onChange('');
                        return;
                      }

                      // Trata o valor como centavos
                      // Converte para número e divide por 100 para ter reais e centavos
                      const cents = parseInt(numbers, 10);
                      const reais = Math.floor(cents / 100);
                      const centavos = cents % 100;

                      // Formata com pontos de milhar
                      const formattedReais = reais
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                      const formattedCentavos = centavos
                        .toString()
                        .padStart(2, '0');

                      const formattedValue = `R$ ${formattedReais},${formattedCentavos}`;
                      field.onChange(formattedValue);

                      // Mantém o cursor no final
                      setTimeout(() => {
                        input.setSelectionRange(
                          formattedValue.length,
                          formattedValue.length,
                        );
                      }, 0);
                    };

                    return (
                      <StyledInput
                        id="amount"
                        type="text"
                        placeholder="R$ 0,00"
                        $error={!!errors.amount}
                        value={field.value || ''}
                        onChange={handleChange}
                        ref={field.ref}
                      />
                    );
                  }}
                />
                {errors.amount && (
                  <ErrorMessage>{errors.amount.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <StyledLabel htmlFor="date">
                  Data <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant="outline"
                          className="w-full justify-start text-left font-normal py-5"
                          aria-invalid={!!errors.date}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isLoading}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && (
                  <ErrorMessage>{errors.date.message}</ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <CheckboxGroup>
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      id="isRecurring"
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <CheckboxLabel htmlFor="isRecurring">
                      Criar como recorrente (12 meses)
                    </CheckboxLabel>
                  </>
                )}
              />
            </CheckboxGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Criar Receita'}
            </SubmitButton>
          </ModalForm>
        </StyledDialogContent>
      </DialogPortal>
    </Dialog>
  );
}
