import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Pencil, Trash2, MoreVertical, CreditCard, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { cardsService } from '../../services/cards.service';
import type {
  CreateCardRequest,
  UpdateCardRequest,
  Card,
} from '../../services/cards.service';
import {
  CardsWrapper,
  CardsMain,
  CardsContent,
  PageHeader,
  PageTitle,
  PageDescription,
  CardsGrid,
  CardItem,
  CardHeader,
  CardNickname,
  CardDefaultBadge,
  CardInfo,
  CardInfoItem,
  CardInfoLabel,
  CardInfoValue,
  CardActions,
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
  CheckboxGroup,
  CheckboxLabel,
  AddCardButton,
} from './styles';

const cardSchema = z.object({
  nickname: z.string().min(1, 'Apelido ou nome do banco é obrigatório'),
  lastFourDigits: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}$/.test(val),
      'Últimos 4 dígitos devem conter exatamente 4 números',
    ),
  dueDate: z
    .date()
    .refine(
      (date) => {
        const day = date.getDate();
        return day >= 1 && day <= 31;
      },
      { message: 'Dia de vencimento deve ser entre 1 e 31' },
    ),
  totalLimit: z
    .string()
    .min(1, 'Limite disponível é obrigatório')
    .refine(
      (val) => {
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const numValue = parseFloat(cleaned);
        return !isNaN(numValue) && numValue > 0 && numValue >= 0.01;
      },
      { message: 'Limite deve ser maior que zero e no mínimo R$ 0,01' },
    ),
  closingDate: z
    .date()
    .refine(
      (date) => {
        const day = date.getDate();
        return day >= 1 && day <= 31;
      },
      { message: 'Dia de fechamento deve ser entre 1 e 31' },
    ),
  isDefault: z.boolean(),
});

type CardFormData = z.infer<typeof cardSchema>;

export function Cards() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadCards();
    }
  }, [isAuthenticated]);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const response = await cardsService.findAll();
      setCards(response.data);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      nickname: '',
      lastFourDigits: '',
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
      totalLimit: '',
      closingDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
      isDefault: false,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isModalOpen) {
      setEditingCardId(null);
      reset({
        nickname: '',
        lastFourDigits: '',
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
        totalLimit: '',
        closingDate: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
        isDefault: false,
      });
    } else if (editingCardId) {
      const card = cards.find((c) => c.id === editingCardId);
      if (card) {
        // Converter número do dia para Date (usando mês/ano atual)
        const now = new Date();
        const dueDate = new Date(now.getFullYear(), now.getMonth(), card.dueDate);
        const closingDate = new Date(now.getFullYear(), now.getMonth(), card.closingDate);
        
        reset({
          nickname: card.nickname,
          lastFourDigits: card.lastFourDigits || '',
          dueDate,
          totalLimit: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format((card.totalLimit ?? card.availableLimit ?? 0) / 100),
          closingDate,
          isDefault: card.isDefault,
        });
      }
    }
  }, [isModalOpen, editingCardId, cards, reset]);

  const onSubmit = async (data: CardFormData) => {
    setIsSubmitting(true);
    try {
      // Converter valor formatado (R$ 3.000,00) para centavos
      const cleanedAmount = data.totalLimit
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const numericAmount = parseFloat(cleanedAmount);
      const amountInCents = Math.round(numericAmount * 100);

      // Extrair apenas o dia da data (1-31)
      const dueDateDay = data.dueDate.getDate();
      const closingDateDay = data.closingDate.getDate();

      if (editingCardId) {
        const requestData: UpdateCardRequest = {
          nickname: data.nickname,
          lastFourDigits: data.lastFourDigits || null,
          dueDate: dueDateDay,
          totalLimit: amountInCents,
          closingDate: closingDateDay,
          isDefault: data.isDefault,
        };
        await cardsService.update(editingCardId, requestData);
      } else {
        const requestData: CreateCardRequest = {
          nickname: data.nickname,
          lastFourDigits: data.lastFourDigits || null,
          dueDate: dueDateDay,
          totalLimit: amountInCents,
          closingDate: closingDateDay,
          isDefault: data.isDefault,
        };
        await cardsService.create(requestData);
      }
      setIsModalOpen(false);
      await loadCards();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      alert('Erro ao salvar cartão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cardId: string) => {
    setEditingCardId(cardId);
    setIsModalOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    if (
      !confirm(
        'Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.',
      )
    ) {
      return;
    }

    try {
      await cardsService.delete(cardId);
      await loadCards();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      alert('Erro ao excluir cartão. Tente novamente.');
    }
  };

  const handleSetAsDefault = async (cardId: string) => {
    try {
      await cardsService.setAsDefault(cardId);
      await loadCards();
    } catch (error) {
      console.error('Erro ao definir cartão como padrão:', error);
      alert('Erro ao definir cartão como padrão. Tente novamente.');
    }
  };

  if (authLoading) {
    return (
      <CardsWrapper>
        <CardsMain>
          <CardsContent>
            <PageTitle>Carregando...</PageTitle>
          </CardsContent>
        </CardsMain>
      </CardsWrapper>
    );
  }

  return (
    <CardsWrapper>
      <Header />
      <CardsMain>
        <CardsContent>
          <PageHeader>
            <div>
              <PageTitle>Cartões de Crédito</PageTitle>
              <PageDescription>
                Gerencie seus cartões de crédito e defina um como padrão
              </PageDescription>
            </div>
          </PageHeader>

          {isLoading ? (
            <CardsGrid>
              {[...Array(3)].map((_, index) => (
                <CardItem key={`skeleton-${index}`}>
                  <CardHeader>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </CardHeader>
                  <CardInfo>
                    <CardInfoItem>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </CardInfoItem>
                    <CardInfoItem>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-8" />
                    </CardInfoItem>
                    <CardInfoItem>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-8" />
                    </CardInfoItem>
                    <CardInfoItem>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </CardInfoItem>
                  </CardInfo>
                </CardItem>
              ))}
            </CardsGrid>
          ) : (
            <CardsGrid>
              {cards.map((card) => (
                <CardItem key={card.id}>
                  <CardHeader>
                    <div>
                      <CardNickname>
                        <CreditCard size={20} />
                        {card.nickname}
                      </CardNickname>
                      {card.isDefault && (
                        <CardDefaultBadge>
                          <Star size={14} fill="currentColor" />
                          Padrão
                        </CardDefaultBadge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CardActions
                          type="button"
                          aria-label="Mais opções"
                        >
                          <MoreVertical size={16} />
                        </CardActions>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!card.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleSetAsDefault(card.id)}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Definir como padrão
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(card.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(card.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardInfo>
                    {card.lastFourDigits && (
                      <CardInfoItem>
                        <CardInfoLabel>Últimos 4 dígitos</CardInfoLabel>
                        <CardInfoValue>**** {card.lastFourDigits}</CardInfoValue>
                      </CardInfoItem>
                    )}
                    <CardInfoItem>
                      <CardInfoLabel>Dia de vencimento</CardInfoLabel>
                      <CardInfoValue>{card.dueDate}</CardInfoValue>
                    </CardInfoItem>
                    <CardInfoItem>
                      <CardInfoLabel>Dia de fechamento</CardInfoLabel>
                      <CardInfoValue>{card.closingDate}</CardInfoValue>
                    </CardInfoItem>
                    <CardInfoItem>
                      <CardInfoLabel>Limite total</CardInfoLabel>
                      <CardInfoValue>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format((card.totalLimit ?? card.availableLimit ?? 0) / 100)}
                      </CardInfoValue>
                    </CardInfoItem>
                    <CardInfoItem>
                      <CardInfoLabel>Limite utilizado</CardInfoLabel>
                      <CardInfoValue>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(card.usedLimit / 100)}
                      </CardInfoValue>
                    </CardInfoItem>
                    <CardInfoItem>
                      <CardInfoLabel>Limite disponível</CardInfoLabel>
                      <CardInfoValue>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(
                          ((card.totalLimit ?? 0) - (card.usedLimit ?? 0)) / 100
                        )}
                      </CardInfoValue>
                    </CardInfoItem>
                  </CardInfo>
                </CardItem>
              ))}
              <AddCardButton
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Adicionar cartão"
              >
                <Plus size={32} />
                <span>Adicionar Cartão</span>
              </AddCardButton>
            </CardsGrid>
          )}
        </CardsContent>
      </CardsMain>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPortal>
          <DialogOverlay />
          <StyledDialogContent>
            <StyledDialogClose
              aria-label="Fechar"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </StyledDialogClose>
            <StyledDialogHeader>
              <StyledDialogTitle>
                {editingCardId ? 'Editar Cartão' : 'Adicionar Cartão'}
              </StyledDialogTitle>
              <StyledDialogDescription>
                {editingCardId
                  ? 'Atualize os dados do cartão.'
                  : 'Preencha os dados do cartão de crédito.'}
              </StyledDialogDescription>
            </StyledDialogHeader>
            <ModalForm onSubmit={handleSubmit(onSubmit)}>
              <FormGroup>
                <StyledLabel htmlFor="nickname">
                  Apelido ou nome do banco{' '}
                  <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <StyledInput
                  id="nickname"
                  type="text"
                  placeholder="Ex: Nubank, Itaú, etc."
                  {...register('nickname')}
                />
                {errors.nickname && (
                  <ErrorMessage>{errors.nickname.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <StyledLabel htmlFor="lastFourDigits">
                  Últimos 4 dígitos (opcional)
                </StyledLabel>
                <Controller
                  name="lastFourDigits"
                  control={control}
                  render={({ field }) => (
                    <StyledInput
                      id="lastFourDigits"
                      type="text"
                      placeholder="1234"
                      maxLength={4}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  )}
                />
                {errors.lastFourDigits && (
                  <ErrorMessage>{errors.lastFourDigits.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <StyledLabel htmlFor="dueDate">
                    Dia de vencimento{' '}
                    <span aria-label="obrigatório">*</span>
                  </StyledLabel>
                  <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dueDate"
                            variant="outline"
                            className="w-full justify-start text-left font-normal py-5"
                            aria-invalid={!!errors.dueDate}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              `Dia ${field.value.getDate()}`
                            ) : (
                              <span>Selecione o dia</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={isSubmitting}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.dueDate && (
                    <ErrorMessage>{errors.dueDate.message}</ErrorMessage>
                  )}
                </FormGroup>

                <FormGroup>
                  <StyledLabel htmlFor="closingDate">
                    Dia de fechamento{' '}
                    <span aria-label="obrigatório">*</span>
                  </StyledLabel>
                  <Controller
                    name="closingDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="closingDate"
                            variant="outline"
                            className="w-full justify-start text-left font-normal py-5"
                            aria-invalid={!!errors.closingDate}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              `Dia ${field.value.getDate()}`
                            ) : (
                              <span>Selecione o dia</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={isSubmitting}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.closingDate && (
                    <ErrorMessage>{errors.closingDate.message}</ErrorMessage>
                  )}
                </FormGroup>
              </FormRow>

              <FormGroup>
                <StyledLabel htmlFor="totalLimit">
                  Limite total{' '}
                  <span aria-label="obrigatório">*</span>
                </StyledLabel>
                <Controller
                  name="totalLimit"
                  control={control}
                  render={({ field }) => {
                    const handleChange = (
                      e: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      const input = e.target;
                      const value = e.target.value;

                      const numbers = value.replace(/\D/g, '');

                      if (!numbers) {
                        field.onChange('');
                        return;
                      }

                      const cents = parseInt(numbers, 10);
                      const reais = Math.floor(cents / 100);
                      const centavos = cents % 100;

                      const formattedReais = reais
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                      const formattedCentavos = centavos
                        .toString()
                        .padStart(2, '0');

                      const formattedValue = `R$ ${formattedReais},${formattedCentavos}`;
                      field.onChange(formattedValue);

                      setTimeout(() => {
                        input.setSelectionRange(
                          formattedValue.length,
                          formattedValue.length,
                        );
                      }, 0);
                    };

                    return (
                      <StyledInput
                        id="totalLimit"
                        type="text"
                        placeholder="R$ 0,00"
                        $error={!!errors.totalLimit}
                        value={field.value || ''}
                        onChange={handleChange}
                        ref={field.ref}
                      />
                    );
                  }}
                />
                {errors.totalLimit && (
                  <ErrorMessage>{errors.totalLimit.message}</ErrorMessage>
                )}
              </FormGroup>

              <CheckboxGroup>
                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field }) => (
                    <>
                      <input
                        id="isDefault"
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                      <CheckboxLabel htmlFor="isDefault">
                        Definir como cartão padrão
                      </CheckboxLabel>
                    </>
                  )}
                />
              </CheckboxGroup>

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editingCardId
                    ? 'Salvando...'
                    : 'Criando...'
                  : editingCardId
                    ? 'Salvar Alterações'
                    : 'Criar Cartão'}
              </SubmitButton>
            </ModalForm>
          </StyledDialogContent>
        </DialogPortal>
      </Dialog>
    </CardsWrapper>
  );
}
