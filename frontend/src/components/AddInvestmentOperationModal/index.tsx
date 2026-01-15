import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
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
import { investmentsService, OperationType, type CreateInvestmentOperationRequest, type UpdateInvestmentOperationRequest } from '../../services/investments.service';
import { withMask } from 'use-mask-input';
import {
  ModalForm,
  FormGroup,
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
} from './styles';

const operationSchema = z.object({
  asset: z.string().min(1, 'Ativo é obrigatório'),
  assetClass: z.string().optional(),
  type: z.enum(['buy', 'sell', 'dividend', 'interest', 'stock_split'], { message: 'Tipo de operação é obrigatório' }),
  date: z.date(),
  quantity: z
    .string()
    .min(1, 'Quantidade é obrigatória')
    .refine(
      (val) => {
        const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
        const numValue = parseFloat(cleaned);
        return !isNaN(numValue) && numValue > 0;
      },
      { message: 'Quantidade deve ser maior que zero' },
    ),
  price: z
    .string()
    .min(1, 'Preço é obrigatório')
    .refine(
      (val) => {
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const numValue = parseFloat(cleaned);
        return !isNaN(numValue) && numValue > 0 && numValue >= 0.01;
      },
      { message: 'Preço deve ser maior que zero e no mínimo R$ 0,01' },
    ),
  currency: z.string().optional(),
  broker: z.string().optional(),
  notes: z.string().optional(),
});

type OperationFormData = z.infer<typeof operationSchema>;

interface AddInvestmentOperationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  operationId?: string | null;
}

const ASSET_CLASSES = [
  { value: 'stock', label: 'Ação' },
  { value: 'bond', label: 'Renda Fixa' },
  { value: 'fund', label: 'Fundo' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Criptomoeda' },
  { value: 'real_estate', label: 'Imóvel' },
  { value: 'cash', label: 'Caixa' },
  { value: 'other', label: 'Outro' },
];

export function AddInvestmentOperationModal({
  open,
  onOpenChange,
  onSuccess,
  operationId,
}: AddInvestmentOperationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!operationId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<OperationFormData>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      asset: '',
      assetClass: '',
      type: OperationType.BUY,
      date: new Date(),
      quantity: '',
      price: '',
      currency: 'BRL',
      broker: '',
      notes: '',
    },
    mode: 'onChange',
  });

  const operationType = watch('type');

  useEffect(() => {
    if (open && operationId) {
      // Carregar dados da operação para edição
      investmentsService
        .getOperation(operationId)
        .then((response) => {
          const op = response.data;
          reset({
            asset: op.asset,
            assetClass: op.assetClass,
            type: op.type,
            date: new Date(op.date),
            quantity: (op.quantity / 10000).toFixed(4), // Converter de centavos
            price: (op.price / 100).toFixed(2), // Converter de centavos
            currency: op.currency,
            broker: op.broker || '',
            notes: op.notes || '',
          });
        })
        .catch(() => {
          setError('Erro ao carregar operação');
        });
    } else if (open && !operationId) {
      reset({
        asset: '',
        assetClass: '',
        type: OperationType.BUY,
        date: new Date(),
        quantity: '',
        price: '',
        currency: 'BRL',
        broker: '',
        notes: '',
      });
    }
  }, [open, operationId, reset]);

  const onSubmit = async (data: OperationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Converter valores
      const cleanedQuantity = data.quantity.replace(/[^\d,.-]/g, '').replace(',', '.');
      const quantity = parseFloat(cleanedQuantity);

      const cleanedPrice = data.price
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const price = parseFloat(cleanedPrice);

      if (isEditing && operationId) {
        const requestData: UpdateInvestmentOperationRequest = {
          asset: data.asset,
          assetClass: data.assetClass || undefined,
          type: data.type,
          date: format(data.date, 'yyyy-MM-dd'),
          quantity,
          price,
          currency: data.currency || undefined,
          broker: data.broker || undefined,
          notes: data.notes || undefined,
        };
        await investmentsService.updateOperation(operationId, requestData);
      } else {
        const requestData: CreateInvestmentOperationRequest = {
          asset: data.asset,
          assetClass: data.assetClass || undefined,
          type: data.type,
          date: format(data.date, 'yyyy-MM-dd'),
          quantity,
          price,
          currency: data.currency || 'BRL',
          broker: data.broker || undefined,
          notes: data.notes || undefined,
        };
        await investmentsService.createOperation(requestData);
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erro ao salvar operação');
      } else {
        setError('Erro ao salvar operação. Tente novamente.');
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
              {isEditing ? 'Editar Operação' : 'Nova Operação de Investimento'}
            </StyledDialogTitle>
            <StyledDialogDescription>
              {isEditing
                ? 'Atualize os dados da operação.'
                : 'Registre uma nova operação de investimento (compra, venda ou proventos).'}
            </StyledDialogDescription>
          </StyledDialogHeader>
          <ModalForm onSubmit={handleSubmit(onSubmit)}>
            <FormGroup>
              <StyledLabel htmlFor="type">
                Tipo de Operação <span aria-label="obrigatório">*</span>
              </StyledLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="type" className="w-full py-5">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OperationType.BUY}>Compra</SelectItem>
                      <SelectItem value={OperationType.SELL}>Venda</SelectItem>
                      <SelectItem value={OperationType.DIVIDEND}>Dividendo</SelectItem>
                      <SelectItem value={OperationType.INTEREST}>Juros</SelectItem>
                      <SelectItem value={OperationType.STOCK_SPLIT}>Desdobramento</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <ErrorMessage>{errors.type.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormRow>
              <FormGroup>
                <StyledLabel htmlFor="asset">
                  Ativo <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <StyledInput
                  id="asset"
                  type="text"
                  placeholder="Ex: PETR4, ITUB4, Bitcoin"
                  {...register('asset')}
                  $error={!!errors.asset}
                />
                {errors.asset && (
                  <ErrorMessage>{errors.asset.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <StyledLabel htmlFor="assetClass">Classe do Ativo</StyledLabel>
                <Controller
                  name="assetClass"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="assetClass" className="w-full py-5">
                        <SelectValue placeholder="Selecione a classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CLASSES.map((ac) => (
                          <SelectItem key={ac.value} value={ac.value}>
                            {ac.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <StyledLabel htmlFor="quantity">
                  Quantidade <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => {
                    const handleChange = (
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      field.onChange(e);
                    };

                    return (
                      <StyledInput
                        {...field}
                        id="quantity"
                        type="text"
                        placeholder={
                          operationType === OperationType.DIVIDEND ||
                          operationType === OperationType.INTEREST
                            ? '0'
                            : 'Ex: 100'
                        }
                        onChange={handleChange}
                        disabled={operationType === OperationType.DIVIDEND || operationType === OperationType.INTEREST}
                        $error={!!errors.quantity}
                        ref={(node) => {
                          field.ref(node);
                          if (node && operationType !== OperationType.DIVIDEND && operationType !== OperationType.INTEREST) {
                            withMask('999999999.9999')(node);
                          }
                        }}
                      />
                    );
                  }}
                />
                {errors.quantity && (
                  <ErrorMessage>{errors.quantity.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <StyledLabel htmlFor="price">
                  {operationType === OperationType.BUY || operationType === OperationType.SELL
                    ? 'Preço Unitário'
                    : 'Valor Total'}{' '}
                  <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => {
                    const handleChange = (
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      field.onChange(e);
                    };

                    return (
                      <StyledInput
                        {...field}
                        id="price"
                        type="text"
                        placeholder="R$ 0,00"
                        onChange={handleChange}
                        $error={!!errors.price}
                        ref={(node) => {
                          field.ref(node);
                          if (node) {
                            withMask('R$ 999.999.999,99')(node);
                          }
                        }}
                      />
                    );
                  }}
                />
                {errors.price && (
                  <ErrorMessage>{errors.price.message}</ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <FormRow>
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
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal py-5"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && (
                  <ErrorMessage>{errors.date.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <StyledLabel htmlFor="currency">Moeda</StyledLabel>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'BRL'}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="currency" className="w-full py-5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL (Real)</SelectItem>
                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <StyledLabel htmlFor="broker">Corretora</StyledLabel>
              <StyledInput
                id="broker"
                type="text"
                placeholder="Ex: Rico, XP, Clear"
                {...register('broker')}
              />
            </FormGroup>

            <FormGroup>
              <StyledLabel htmlFor="notes">Observações</StyledLabel>
              <StyledInput
                id="notes"
                type="text"
                placeholder="Observações adicionais (opcional)"
                {...register('notes')}
              />
            </FormGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading
                ? 'Salvando...'
                : isEditing
                  ? 'Atualizar Operação'
                  : 'Adicionar Operação'}
            </SubmitButton>
          </ModalForm>
        </StyledDialogContent>
      </DialogPortal>
    </Dialog>
  );
}
