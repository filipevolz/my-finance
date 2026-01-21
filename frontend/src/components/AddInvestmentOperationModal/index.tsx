import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { investmentsService, OperationType, type CreateInvestmentOperationRequest, type UpdateInvestmentOperationRequest, type AssetType, type Exchange, type Asset } from '../../services/investments.service';
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
  AssetCommandItem,
  AssetImage,
  AssetText,
} from './styles';

const operationSchema = z.object({
  asset: z.string().optional(),
  assetClass: z.string().optional(),
  type: z.enum(['buy', 'sell', 'dividend', 'interest', 'stock_split'], { message: 'Tipo de operação é obrigatório' }),
  date: z.date(),
  quantity: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  broker: z.string().optional(),
  notes: z.string().optional(),
  // Campos específicos por categoria
  assetType: z.string().optional(), // Tipo (para StockExchange, Treasury, Account)
  operation: z.string().optional(), // Operação (Subscription, Bonus, ManualBuy, etc.)
  proventType: z.string().optional(), // Tipo de provento (para operação Provent)
  issuer: z.string().optional(), // Emissor (para FixedIncome_USA, FixedIncome)
  fundName: z.string().optional(), // Nome do fundo (para Fund)
  launchType: z.string().optional(), // Tipo de lançamento (para Fund)
  rateType: z.string().optional(), // Tipo de taxa (para FixedIncome)
  maturity: z.date().optional(), // Vencimento (para FixedIncome, FixedIncome_USA)
  indexer: z.string().optional(), // Indexador (para FixedIncome)
  ratePercentage: z.string().optional(), // % ao ano (para FixedIncome_USA)
  percentageOf: z.string().optional(), // % do (para FixedIncome)
  time: z.string().optional(), // Horário (para Cryptocurrency)
  totalInvested: z.string().optional(), // Total investido (para vários)
  assetName: z.string().optional(), // Nome do ativo ou bem (para Other)
}).refine((data) => {
  // Validação condicional baseada na categoria
  if (data.assetClass === 'StockExchange' || data.assetClass === 'Treasury') {
    return !!(data.asset && data.quantity && data.price);
  }
  if (data.assetClass === 'FixedIncome') {
    return !!(data.rateType && data.maturity && data.indexer && data.totalInvested);
  }
  if (data.assetClass === 'FixedIncome_USA') {
    return !!(data.issuer && data.maturity && data.ratePercentage && data.price);
  }
  if (data.assetClass === 'Fund') {
    return !!(data.fundName && data.launchType && data.totalInvested);
  }
  if (data.assetClass === 'Cryptocurrency') {
    return !!(data.asset && data.quantity && data.price && data.price);
  }
  if (data.assetClass === 'Account') {
    return !!data.price; // Total
  }
  if (data.assetClass === 'Other') {
    return !!(data.assetName && data.totalInvested);
  }
  return true;
}, { message: 'Preencha todos os campos obrigatórios' });

type OperationFormData = z.infer<typeof operationSchema>;

interface AddInvestmentOperationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  operationId?: string | null;
}

const ASSET_CLASSES = [
  { value: 'StockExchange', label: 'Bolsa de Valores (BR e EUA)' },
  { value: 'Treasury', label: 'Tesouro Direto' },
  { value: 'FixedIncome', label: 'Renda Fixa' },
  { value: 'FixedIncome_USA', label: 'Renda Fixa EUA' },
  { value: 'Fund', label: 'Fundos de investimento' },
  { value: 'Cryptocurrency', label: 'Criptomoeda' },
  { value: 'Account', label: 'Caixa/Conta corrente' },
  { value: 'Other', label: 'Outros' },
];


const OPERATION_TYPES = [
  { value: 'Subscription', label: 'Subscrição' },
  { value: 'Bonus', label: 'Bonificação' },
  { value: 'ManualBuy', label: 'Compra' },
  { value: 'ManualSell', label: 'Venda' },
  { value: 'IPO', label: 'IPO' },
  { value: 'Taxas', label: 'Taxas' },
  { value: 'Provent', label: 'Proventos/Sobras' },
  { value: 'Cashout', label: 'Cashout' },
  { value: 'AdjustQty', label: 'Ajustar qtde.' },
  { value: 'AdjustPrice', label: 'Ajustar preço médio' },
];

const PROVENT_TYPES = [
  { value: 'RENDIMENTO', label: 'Rendimentos (FII)' },
  { value: 'DIVIDENDO', label: 'Dividendos (Ações)' },
  { value: 'JCP', label: 'JCP (Ações)' },
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'SOBRAS', label: 'Sobras' },
  { value: 'AMORTIZAÇÃO', label: 'Amortização' },
];


export function AddInvestmentOperationModal({
  open,
  onOpenChange,
  onSuccess,
  operationId,
}: AddInvestmentOperationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const isEditing = !!operationId;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
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
      assetType: '',
      operation: '',
      proventType: '',
      issuer: '',
      fundName: '',
      launchType: '',
      rateType: '',
      maturity: undefined,
      indexer: '',
      ratePercentage: '',
      percentageOf: '',
      time: '',
      totalInvested: '',
      assetName: '',
    },
    mode: 'onChange',
  });

  const assetClass = watch('assetClass');
  const assetType = watch('assetType');
  const operation = watch('operation');

  // Carregar tipos de ativos e exchanges do backend
  useEffect(() => {
    if (open) {
      // Carregar asset types
      investmentsService
        .getAssetTypes()
        .then((response) => {
          setAssetTypes(response.data);
        })
        .catch(() => {
          setAssetTypes([]);
        });

      // Carregar exchanges
      investmentsService
        .getExchanges()
        .then((response) => {
          setExchanges(response.data);
        })
        .catch(() => {
          setExchanges([]);
        });

      // Não carregar todos os assets de uma vez - será carregado sob demanda
      setAssets([]);
      setAssetSearch('');
    }
  }, [open]);

  // Buscar assets com debounce quando o usuário digita
  useEffect(() => {
    // Só buscar se for StockExchange e tiver assetType selecionado
    if (!open || !isAssetSearchOpen || assetClass !== 'StockExchange' || !assetType) {
      setAssets([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Buscar apenas se tiver pelo menos 2 caracteres ou estiver vazio (para mostrar alguns resultados iniciais)
      if (assetSearch.length >= 2 || assetSearch.length === 0) {
        setIsLoadingAssets(true);
        // Usar o assetType selecionado como assetGroup (STOCK, STOCK_USA, etc)
        investmentsService
          .searchAssets(assetSearch || undefined, assetType, 50)
          .then((response) => {
            setAssets(response.data);
            setIsLoadingAssets(false);
          })
          .catch(() => {
            setAssets([]);
            setIsLoadingAssets(false);
          });
      } else {
        setAssets([]);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [assetSearch, isAssetSearchOpen, assetClass, assetType, open]);

  // Função helper para formatação de valores monetários (igual ao modal de receita)
  const handleCurrencyChange = (
    field: { onChange: (value: string) => void; value?: string; ref: (node: HTMLInputElement | null) => void },
    input: HTMLInputElement,
    value: string,
  ) => {
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

  useEffect(() => {
    if (open && operationId) {
      // Carregar dados da operação para edição
      investmentsService
        .getOperation(operationId)
        .then((response) => {
          const op = response.data;
          // Formatar valores para exibição
          const priceInReais = op.price / 100; // Converter de centavos para reais
          const formattedPrice = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(priceInReais);

          reset({
            asset: op.asset,
            assetClass: op.assetClass,
            type: op.type,
            date: new Date(op.date),
            quantity: op.quantity.toString(), // Quantidade é inteiro
            price: formattedPrice, // Preço formatado em R$
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

  // Mapear operação do formulário para tipo do backend
  const mapOperationToType = (operation: string): string => {
    const operationMap: Record<string, string> = {
      'Subscription': OperationType.BUY,
      'Bonus': OperationType.STOCK_SPLIT,
      'ManualBuy': OperationType.BUY,
      'ManualSell': OperationType.SELL,
      'IPO': OperationType.BUY,
      'Taxas': OperationType.SELL, // Taxas são tratadas como venda/despesa
      'Provent': OperationType.DIVIDEND,
      'Cashout': OperationType.SELL,
      'AdjustQty': OperationType.BUY, // Ajuste de quantidade
      'AdjustPrice': OperationType.BUY, // Ajuste de preço
    };
    return operationMap[operation] || OperationType.BUY;
  };

  const onSubmit = async (data: OperationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Converter valores baseado na categoria
      let quantity = 0;
      let price = 0;
      let totalInvested = 0;

      // Quantidade é número inteiro sem máscara
      if (data.quantity) {
        quantity = parseInt(data.quantity, 10) || 0;
      }

      // Preço e Total são em R$ e precisam ser convertidos para centavos
      if (data.price) {
        const cleanedPrice = data.price
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const priceValue = parseFloat(cleanedPrice) || 0;
        price = Math.round(priceValue * 100); // Converter para centavos
      }

      if (data.totalInvested) {
        const cleanedTotal = data.totalInvested
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const totalValue = parseFloat(cleanedTotal) || 0;
        totalInvested = Math.round(totalValue * 100); // Converter para centavos
      }

      // Usar totalInvested se disponível, senão usar price (já em centavos)
      const finalPrice = totalInvested > 0 ? totalInvested : price;
      const finalAsset = data.asset || data.assetName || '';
      
      // Mapear operação para tipo do backend
      const finalType = data.operation ? mapOperationToType(data.operation) : data.type;

      if (isEditing && operationId) {
        const requestData: UpdateInvestmentOperationRequest = {
          asset: finalAsset,
          assetClass: data.assetClass || undefined,
          type: finalType as any,
          date: format(data.date, 'yyyy-MM-dd'),
          quantity: quantity || 0,
          price: finalPrice || 0,
          currency: data.currency || undefined,
          broker: data.broker || undefined,
          notes: data.notes || undefined,
        };
        await investmentsService.updateOperation(operationId, requestData);
      } else {
        const requestData: CreateInvestmentOperationRequest = {
          asset: finalAsset,
          assetClass: data.assetClass || undefined,
          type: finalType as any,
          date: format(data.date, 'yyyy-MM-dd'),
          quantity: quantity || 0,
          price: finalPrice || 0,
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
              <StyledLabel htmlFor="assetClass">Categoria <span aria-label="obrigatório">*</span></StyledLabel>
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
                      <SelectValue placeholder="Selecione a categoria" />
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

            {/* Campos condicionais baseados na categoria */}
            {assetClass && (
              <>
                {/* StockExchange e Treasury: Tipo, Operação, Ativo, Data, Instituição, Total, Quantidade, Preço */}
                {(assetClass === 'StockExchange' || assetClass === 'Treasury') && (
                  <>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="assetType">Tipo</StyledLabel>
                        <Controller
                          name="assetType"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={isLoading}
                            >
                              <SelectTrigger id="assetType" className="w-full py-5">
                                <SelectValue placeholder="Tipo de ativo" />
                              </SelectTrigger>
                              <SelectContent>
                                {assetTypes
                                  .filter((at) => at.category === 'StockExchange')
                                  .map((at) => (
                                    <SelectItem key={at.id} value={at.assetGroup}>
                                      {at.groupName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="operation">
                          Operação <span aria-label="obrigatório">*</span>
                        </StyledLabel>
                        <Controller
                          name="operation"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={isLoading}
                            >
                              <SelectTrigger id="operation" className="w-full py-5">
                                <SelectValue placeholder="Selecione a operação" />
                              </SelectTrigger>
                              <SelectContent>
                                {OPERATION_TYPES.map((ot) => (
                                  <SelectItem key={ot.value} value={ot.value}>
                                    {ot.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                    </FormRow>
                    {operation === 'Provent' && assetClass === 'StockExchange' && (
                      <FormGroup>
                        <StyledLabel htmlFor="proventType">Tipo</StyledLabel>
                        <Controller
                          name="proventType"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={isLoading}
                            >
                              <SelectTrigger id="proventType" className="w-full py-5">
                                <SelectValue placeholder="Tipo de provento" />
                              </SelectTrigger>
                              <SelectContent>
                                {PROVENT_TYPES.map((pt) => (
                                  <SelectItem key={pt.value} value={pt.value}>
                                    {pt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                    )}
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="asset">
                          Ativo <span aria-label="obrigatório">*</span>
                        </StyledLabel>
                        <Controller
                          name="asset"
                          control={control}
                          render={({ field }) => (
                            <Popover
                              open={isAssetSearchOpen}
                              onOpenChange={(open) => {
                                if (!assetType) return; // Não abrir se não tiver tipo selecionado
                                setIsAssetSearchOpen(open);
                                if (!open) {
                                  setAssetSearch('');
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isAssetSearchOpen}
                                  className="w-full justify-between py-5"
                                  id="asset"
                                  disabled={!assetType}
                                >
                                  {field.value || 'Selecione o ativo'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              {assetType && (
                                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder="Buscar ativo (ticker ou nome)..."
                                      value={assetSearch}
                                      onValueChange={setAssetSearch}
                                    />
                                    <CommandList>
                                      {isLoadingAssets ? (
                                        <div className="py-6 text-center text-sm">
                                          Carregando...
                                        </div>
                                      ) : (
                                        <>
                                          <CommandEmpty>
                                            {assetSearch.length < 2
                                              ? 'Digite pelo menos 2 caracteres para buscar'
                                              : 'Nenhum ativo encontrado'}
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {assets.map((a) => {
                                              // Usar legalName se disponível, senão assetName
                                              const displayName = a.legalName || a.assetName || a.ticker;
                                              return (
                                                <CommandItem
                                                  key={a.id}
                                                  value={`${a.ticker} ${displayName}`}
                                                  onSelect={() => {
                                                    field.onChange(a.ticker);
                                                    setIsAssetSearchOpen(false);
                                                    setAssetSearch('');
                                                  }}
                                                >
                                                  <AssetCommandItem>
                                                    {a.pic && (
                                                      <AssetImage
                                                        src={a.pic}
                                                        alt={`Logo ${a.ticker}`}
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = 'none';
                                                        }}
                                                      />
                                                    )}
                                                    <AssetText>
                                                      {a.ticker} - {displayName}
                                                    </AssetText>
                                                  </AssetCommandItem>
                                                </CommandItem>
                                              );
                                            })}
                                          </CommandGroup>
                                        </>
                                      )}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              )}
                            </Popover>
                          )}
                        />
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
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal py-5"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, 'dd/MM/yyyy')
                                  ) : (
                                    <span>dd/mm/aaaa</span>
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
                      </FormGroup>
                    </FormRow>
                    <FormGroup>
                      <StyledLabel htmlFor="broker">Instituição</StyledLabel>
                      <Controller
                        name="broker"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                          >
                            <SelectTrigger id="broker" className="w-full py-5">
                              <SelectValue placeholder="Selecione a instituição" />
                            </SelectTrigger>
                            <SelectContent>
                              {exchanges
                                .filter((ex) => {
                                  // Filtrar exchanges que suportam a categoria selecionada
                                  if (!assetClass) return true;
                                  const categories = ex.category.split(';');
                                  return categories.includes(assetClass);
                                })
                                .map((ex) => (
                                  <SelectItem key={ex.id} value={ex.exchangeName}>
                                    {ex.exchangeName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormGroup>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="totalInvested">Total</StyledLabel>
                        <Controller
                          name="totalInvested"
                          control={control}
                          render={({ field }) => {
                            const handleChange = (
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                              handleCurrencyChange(field, e.target, e.target.value);
                            };

                            return (
                              <StyledInput
                                id="totalInvested"
                                type="text"
                                placeholder="R$ 0,00"
                                $error={!!errors.price}
                                value={field.value || ''}
                                onChange={handleChange}
                                ref={field.ref}
                              />
                            );
                          }}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="quantity">Quantidade</StyledLabel>
                        <Controller
                          name="quantity"
                          control={control}
                          render={({ field }) => (
                            <StyledInput
                              {...field}
                              id="quantity"
                              type="number"
                              placeholder="Ex: 100"
                              $error={!!errors.quantity}
                            />
                          )}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="price">Preço</StyledLabel>
                        <Controller
                          name="price"
                          control={control}
                          render={({ field }) => {
                            const handleChange = (
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                              handleCurrencyChange(field, e.target, e.target.value);
                            };

                            return (
                              <StyledInput
                                id="price"
                                type="text"
                                placeholder="R$ 0,00"
                                $error={!!errors.price}
                                value={field.value || ''}
                                onChange={handleChange}
                                ref={field.ref}
                              />
                            );
                          }}
                        />
                      </FormGroup>
                    </FormRow>
                  </>
                )}

                {/* Account: Categoria, Tipo, Operação, Data da operação, Instituição, Total */}
                {assetClass === 'Account' && (
                  <>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="assetType">Tipo</StyledLabel>
                        <StyledInput
                          id="assetType"
                          type="text"
                          placeholder="Ex: Conta corrente, Poupança"
                          {...register('assetType')}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="type">
                          Operação <span aria-label="obrigatório">*</span>
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
                                <SelectValue placeholder="Selecione a operação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={OperationType.BUY}>Aplicação</SelectItem>
                                <SelectItem value={OperationType.SELL}>Resgate</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                    </FormRow>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="date">
                          Data da operação <span aria-label="obrigatório">*</span>
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
                                    <span>dd/mm/aaaa</span>
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
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="broker">Instituição</StyledLabel>
                        <StyledInput
                          id="broker"
                          type="text"
                          placeholder="Ex: Banco do Brasil, Itaú"
                          {...register('broker')}
                        />
                      </FormGroup>
                    </FormRow>
                    <FormGroup>
                      <StyledLabel htmlFor="price">Total</StyledLabel>
                      <Controller
                        name="price"
                        control={control}
                        render={({ field }) => {
                          const handleChange = (
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            handleCurrencyChange(field, e.target, e.target.value);
                          };

                          return (
                            <StyledInput
                              id="price"
                              type="text"
                              placeholder="R$ 0,00"
                              $error={!!errors.price}
                              value={field.value || ''}
                              onChange={handleChange}
                              ref={field.ref}
                            />
                          );
                        }}
                      />
                    </FormGroup>
                  </>
                )}

                {/* Other: Categoria, Nome do ativo ou bem, Operação, Data da operação, Total investido */}
                {assetClass === 'Other' && (
                  <>
                    <FormGroup>
                      <StyledLabel htmlFor="assetName">
                        Nome do ativo ou bem <span aria-label="obrigatório">*</span>
                      </StyledLabel>
                      <StyledInput
                        id="assetName"
                        type="text"
                        placeholder="Ex: Imóvel, Ouro, Arte"
                        {...register('assetName')}
                        $error={!!errors.asset}
                      />
                    </FormGroup>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="type">
                          Operação <span aria-label="obrigatório">*</span>
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
                                <SelectValue placeholder="Selecione a operação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={OperationType.BUY}>Aplicação</SelectItem>
                                <SelectItem value={OperationType.SELL}>Resgate</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="date">
                          Data da operação <span aria-label="obrigatório">*</span>
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
                                    <span>dd/mm/aaaa</span>
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
                      </FormGroup>
                    </FormRow>
                    <FormGroup>
                      <StyledLabel htmlFor="totalInvested">Total investido</StyledLabel>
                      <Controller
                        name="totalInvested"
                        control={control}
                        render={({ field }) => {
                          const handleChange = (
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            handleCurrencyChange(field, e.target, e.target.value);
                          };

                          return (
                            <StyledInput
                              id="totalInvested"
                              type="text"
                              placeholder="R$ 0,00"
                              $error={!!errors.price}
                              value={field.value || ''}
                              onChange={handleChange}
                              ref={field.ref}
                            />
                          );
                        }}
                      />
                    </FormGroup>
                  </>
                )}

                {/* Cryptocurrency: Categoria, Operação, Ativo, Data da operação, Horário (opcional), Instituição, Total, Quantidade, Preço */}
                {assetClass === 'Cryptocurrency' && (
                  <>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="type">
                          Operação <span aria-label="obrigatório">*</span>
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
                                <SelectValue placeholder="Selecione a operação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={OperationType.BUY}>Compra</SelectItem>
                                <SelectItem value={OperationType.SELL}>Venda</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="asset">
                          Ativo <span aria-label="obrigatório">*</span>
                        </StyledLabel>
                        <Controller
                          name="asset"
                          control={control}
                          render={({ field }) => (
                            <Popover
                              open={isAssetSearchOpen}
                              onOpenChange={(open) => {
                                setIsAssetSearchOpen(open);
                                if (!open) {
                                  setAssetSearch('');
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={isAssetSearchOpen}
                                  className="w-full justify-between py-5"
                                  id="asset"
                                >
                                  {field.value || 'Selecione o ativo'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                                <Command>
                                  <CommandInput
                                    placeholder="Buscar ativo (ticker ou nome)..."
                                    value={assetSearch}
                                    onValueChange={setAssetSearch}
                                  />
                                  <CommandList>
                                    {isLoadingAssets ? (
                                      <div className="py-6 text-center text-sm">
                                        Carregando...
                                      </div>
                                    ) : (
                                      <>
                                        <CommandEmpty>
                                          {assetSearch.length < 2
                                            ? 'Digite pelo menos 2 caracteres para buscar'
                                            : 'Nenhum ativo encontrado'}
                                        </CommandEmpty>
                                        <CommandGroup>
                                          {assets.map((a) => {
                                            // Usar legalName se disponível, senão assetName
                                            const displayName = a.legalName || a.assetName || a.ticker;
                                            return (
                                              <CommandItem
                                                key={a.id}
                                                value={`${a.ticker} ${displayName}`}
                                                onSelect={() => {
                                                  field.onChange(a.ticker);
                                                  setIsAssetSearchOpen(false);
                                                  setAssetSearch('');
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    'mr-2 h-4 w-4',
                                                    field.value === a.ticker
                                                      ? 'opacity-100'
                                                      : 'opacity-0',
                                                  )}
                                                />
                                                {a.ticker} - {displayName}
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      </>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </FormGroup>
                    </FormRow>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="date">
                          Data da operação <span aria-label="obrigatório">*</span>
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
                                    <span>dd/mm/aaaa</span>
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
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="time">Horário (opcional)</StyledLabel>
                        <StyledInput
                          id="time"
                          type="text"
                          placeholder="--:--"
                          {...register('time')}
                          ref={(node) => {
                            if (node) {
                              withMask('99:99')(node);
                            }
                          }}
                        />
                      </FormGroup>
                    </FormRow>
                    <FormGroup>
                      <StyledLabel htmlFor="broker">Instituição</StyledLabel>
                      <StyledInput
                        id="broker"
                        type="text"
                        placeholder="Ex: Binance, Coinbase"
                        {...register('broker')}
                      />
                    </FormGroup>
                    <FormRow>
                      <FormGroup>
                        <StyledLabel htmlFor="price">Total</StyledLabel>
                        <Controller
                          name="price"
                          control={control}
                          render={({ field }) => {
                            const handleChange = (
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => {
                              handleCurrencyChange(field, e.target, e.target.value);
                            };

                            return (
                              <StyledInput
                                id="price"
                                type="text"
                                placeholder="R$ 0,00"
                                $error={!!errors.price}
                                value={field.value || ''}
                                onChange={handleChange}
                                ref={field.ref}
                              />
                            );
                          }}
                        />
                      </FormGroup>
                      <FormGroup>
                        <StyledLabel htmlFor="quantity">Quantidade</StyledLabel>
                        <Controller
                          name="quantity"
                          control={control}
                          render={({ field }) => (
                            <StyledInput
                              {...field}
                              id="quantity"
                              type="number"
                              placeholder="Ex: 1"
                              $error={!!errors.quantity}
                            />
                          )}
                        />
                      </FormGroup>
                    </FormRow>
                  </>
                )}
              </>
            )}

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit" disabled={isLoading || !isValid}>
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
