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
import { expensesService } from '../../services/expenses.service';
import type {
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '../../services/expenses.service';
import { categoriesService } from '../../services/categories.service';
import type { Category, CategoryType } from '../../services/categories.service';
import { IconRenderer } from '../../utils/iconMapper';
import {
  ModalForm,
  FormGroup,
  CategorySelectItemContent,
  FormRow,
  ErrorMessage,
  SubmitButton,
  StyledInput,
  StyledDialogContent,
  StyledDialogHeader,
  StyledDialogTitle,
  StyledDialogDescription,
  StyledLabel,
  StyledDialogClose,
} from '../AddIncomeModal/styles';

const expenseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine(
      (val) => {
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const numValue = parseFloat(cleaned);
        return !isNaN(numValue) && numValue > 0 && numValue >= 0.01;
      },
      { message: 'Valor deve ser maior que zero e no mínimo R$ 0,01' },
    ),
  date: z.date(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  expenseId?: string | null;
}

export function AddExpenseModal({
  open,
  onOpenChange,
  onSuccess,
  expenseId,
}: AddExpenseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const isEditing = !!expenseId;

  useEffect(() => {
    if (open) {
      setIsLoadingCategories(true);
      void categoriesService
        .findAll('expense' as CategoryType)
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
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      category: '',
      amount: '',
      date: new Date(),
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) return;
  
    // editar
    if (expenseId && !isLoadingCategories && categories.length > 0) {
      void expensesService
        .findOne(expenseId)
        .then((response) => {
          const expense = response.data;
  
          const dateStr = expense.date.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const expenseDate = new Date(year, month - 1, day);
  
          reset({
            name: expense.name || '',
            category: expense.category,
            amount: new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(expense.amount / 100),
            date: expenseDate,
          });
        });
    }
  
    // criar
    if (!expenseId && !isLoadingCategories) {
      reset({
        name: '',
        category: '',
        amount: '',
        date: new Date(),
      });
    }
  }, [open, expenseId, isLoadingCategories, categories.length, reset]);
  

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Converter valor formatado (R$ 3.000,00) para centavos
      const cleanedAmount = data.amount
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const numericAmount = parseFloat(cleanedAmount);
      const amountInCents = Math.round(numericAmount * 100);

      if (isEditing && expenseId) {
        const requestData: UpdateExpenseRequest = {
          name: data.name || undefined,
          category: data.category,
          amount: amountInCents,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
        };
        await expensesService.update(expenseId, requestData);
      } else {
        const requestData: CreateExpenseRequest = {
          name: data.name || undefined,
          category: data.category,
          amount: amountInCents,
          date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
        };
        await expensesService.create(requestData);
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erro ao criar despesa');
      } else {
        setError('Erro ao criar despesa. Tente novamente.');
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
          <StyledDialogHeader>
            <StyledDialogTitle>
              {isEditing ? 'Editar Despesa' : 'Adicionar Despesa'}
            </StyledDialogTitle>
            <StyledDialogDescription>
              {isEditing
                ? 'Atualize os dados da despesa.'
                : 'Preencha os dados da despesa.'}
            </StyledDialogDescription>
          </StyledDialogHeader>
          <ModalForm onSubmit={handleSubmit(onSubmit)}>
            <FormGroup>
              <StyledLabel htmlFor="name">Nome da despesa</StyledLabel>
              <StyledInput
                id="name"
                type="text"
                placeholder="Nome da despesa"
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
                    <SelectContent>
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

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Criar Despesa'}
            </SubmitButton>
          </ModalForm>
          <StyledDialogClose aria-label="Fechar">
            <X size={20} />
          </StyledDialogClose>
        </StyledDialogContent>
      </DialogPortal>
    </Dialog>
  );
}
