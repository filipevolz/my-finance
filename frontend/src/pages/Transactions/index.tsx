import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import {
  Filter,
  X,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Header } from '../../components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { incomesService } from '../../services/incomes.service';
import { categoriesService } from '../../services/categories.service';
import type { Category } from '../../services/categories.service';
import { expensesService } from '../../services/expenses.service';
import { IconRenderer } from '../../utils/iconMapper';
import {
  TransactionsWrapper,
  TransactionsMain,
  TransactionsContent,
  PageTitle,
  SearchAndFiltersContainer,
  SearchInputWrapper,
  SearchIcon,
  SearchInput,
  FilterBadge,
  FiltersSection,
  FiltersGrid,
  FilterGroup,
  FilterLabel,
  FilterInput,
  CurrencyInputWrapper,
  CurrencyPrefix,
  CurrencyInput,
  FilterButton,
  ClearFiltersButton,
  ApplyFiltersButton,
  FiltersActionsContainer,
  DatePickerButton,
  TransactionsTable,
  TableHeader,
  TableRow,
  TransactionCell,
  TransactionCellContent,
  TransactionDescription,
  TransactionMethod,
  TransactionDate,
  TransactionAmount,
  TransactionActions,
  TableEmptyCell,
  EmptyStateText,
  CategoryIcon,
  TransactionPaid,
} from './styles';
import { AddIncomeModal } from '@/components/AddIncomeModal';
import { AddExpenseModal } from '@/components/AddExpenseModal';

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-12-months';

export function Transactions() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      description: string;
      categoryIcon: string;
      category: string;
      date: string;
      purchaseDate?: string | null;
      amount: number;
      type: 'income' | 'expense';
      is_paid?: boolean;
      groupId?: string | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState<string | null>(null);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // Filtros aplicados (usados na busca)
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate?: Date;
    endDate?: Date;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    description?: string;
    period?: Period;
    month?: number;
    year?: number;
    type?: 'income' | 'expense';
  }>({});
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(undefined);
  // Filtros temporários (em edição)
  const [tempFilters, setTempFilters] = useState<{
    startDate?: Date;
    endDate?: Date;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    description?: string;
    period?: Period;
    month?: number;
    year?: number;
    type?: 'income' | 'expense';
  }>({});
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [minAmountDisplay, setMinAmountDisplay] = useState('');
  const [maxAmountDisplay, setMaxAmountDisplay] = useState('');

  // Função helper para formatar valor monetário brasileiro
  const formatCurrency = (cents: number | undefined): string => {
    if (cents === undefined) return '';
    const reais = Math.floor(cents / 100);
    const centavos = cents % 100;
    const formattedReais = reais
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formattedCentavos = centavos.toString().padStart(2, '0');
    return `${formattedReais},${formattedCentavos}`;
  };

  // Função handler para mudanças no input de valor mínimo
  const handleMinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = e.target.value;

    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');

    if (!numbers) {
      setMinAmountDisplay('');
      setTempFilters({
        ...tempFilters,
        minAmount: undefined,
      });
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
    const formattedCentavos = centavos.toString().padStart(2, '0');

    const formattedValue = `${formattedReais},${formattedCentavos}`;
    setMinAmountDisplay(formattedValue);

    setTempFilters({
      ...tempFilters,
      minAmount: cents,
    });

    // Mantém o cursor no final
    setTimeout(() => {
      input.setSelectionRange(formattedValue.length, formattedValue.length);
    }, 0);
  };

  // Função handler para mudanças no input de valor máximo
  const handleMaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const value = e.target.value;

    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');

    if (!numbers) {
      setMaxAmountDisplay('');
      setTempFilters({
        ...tempFilters,
        maxAmount: undefined,
      });
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
    const formattedCentavos = centavos.toString().padStart(2, '0');

    const formattedValue = `${formattedReais},${formattedCentavos}`;
    setMaxAmountDisplay(formattedValue);

    setTempFilters({
      ...tempFilters,
      maxAmount: cents,
    });

    // Mantém o cursor no final
    setTimeout(() => {
      input.setSelectionRange(formattedValue.length, formattedValue.length);
    }, 0);
  };

  // Sincroniza os valores de display quando os filtros temporários mudam externamente
  useEffect(() => {
    if (tempFilters.minAmount === undefined) {
      setMinAmountDisplay('');
    } else if (formatCurrency(tempFilters.minAmount) !== minAmountDisplay) {
      setMinAmountDisplay(formatCurrency(tempFilters.minAmount));
    }
  }, [tempFilters.minAmount]);

  useEffect(() => {
    if (tempFilters.maxAmount === undefined) {
      setMaxAmountDisplay('');
    } else if (formatCurrency(tempFilters.maxAmount) !== maxAmountDisplay) {
      setMaxAmountDisplay(formatCurrency(tempFilters.maxAmount));
    }
  }, [tempFilters.maxAmount]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await categoriesService.findAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadCategories();
    }
  }, [isAuthenticated, loadCategories]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentFilters = { ...appliedFilters };
      if (appliedDateRange?.from && appliedDateRange?.to) {
        currentFilters.startDate = appliedDateRange.from;
        currentFilters.endDate = appliedDateRange.to;
      }
      const response = await incomesService.getTransactions(currentFilters);
      const transactionsInReais = response.data.map((trans) => {
        const dateParts = trans.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        const formattedPurchaseDate = trans.purchaseDate
          ? (() => {
              const purchaseParts = trans.purchaseDate.split('-');
              return `${purchaseParts[2]}/${purchaseParts[1]}/${purchaseParts[0]}`;
            })()
          : null;
        return {
          ...trans,
          date: formattedDate,
          purchaseDate: formattedPurchaseDate,
          amount: trans.amount / 100,
        };
      });
      setTransactions(transactionsInReais);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, appliedDateRange]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTransactions();
    }
  }, [isAuthenticated, loadTransactions]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...tempFilters });
    setAppliedDateRange(tempDateRange);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setAppliedFilters({});
    setTempDateRange(undefined);
    setAppliedDateRange(undefined);
    setMinAmountDisplay('');
    setMaxAmountDisplay('');
    void loadTransactions();
  };

  const handleIncomeCreated = () => {
    loadCategories();
    loadTransactions();
    setEditingIncomeId(null);
  };

  const handleExpenseCreated = () => {
    loadCategories();
    loadTransactions();
    setEditingExpenseId(null);
  };

  const handleEditIncome = (incomeId: string) => {
    setEditingIncomeId(incomeId);
    setIsAddIncomeModalOpen(true);
  };

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setIsAddExpenseModalOpen(true);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (
      !confirm('Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.')
    ) {
      return;
    }
    try {
      await incomesService.delete(incomeId);
      void loadTransactions();
    } catch (error) {
      console.error('Erro ao excluir receita:', error);
      alert('Erro ao excluir receita. Tente novamente.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      // Buscar a expense para verificar se tem groupId
      const expenseResponse = await expensesService.findOne(expenseId);
      const expense = expenseResponse.data;

      // Verificar se tem groupId (pode ser null, undefined ou string vazia)
      if (expense.groupId && expense.groupId.trim() !== '') {
        // Se tem groupId, mostrar diálogo perguntando se quer excluir todo o grupo
        setPendingDeleteExpenseId(expenseId);
        setPendingDeleteGroupId(expense.groupId);
        setShowDeleteGroupDialog(true);
      } else {
        // Se não tem groupId, excluir normalmente
        if (
          !confirm('Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.')
        ) {
          return;
        }
        await expensesService.delete(expenseId);
        void loadTransactions();
      }
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      alert('Erro ao excluir despesa. Tente novamente.');
    }
  };

  const handleDeleteGroupConfirm = async (deleteGroup: boolean) => {
    if (!pendingDeleteExpenseId) return;

    try {
      if (deleteGroup && pendingDeleteGroupId) {
        await expensesService.deleteGroup(pendingDeleteGroupId);
      } else {
        await expensesService.delete(pendingDeleteExpenseId);
      }
      void loadTransactions();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      alert('Erro ao excluir despesa. Tente novamente.');
    } finally {
      setShowDeleteGroupDialog(false);
      setPendingDeleteExpenseId(null);
      setPendingDeleteGroupId(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  if (authLoading) {
    return (
      <TransactionsWrapper>
        <TransactionsMain>
          <TransactionsContent>
            <PageTitle>Carregando...</PageTitle>
          </TransactionsContent>
        </TransactionsMain>
      </TransactionsWrapper>
    );
  }

  if (!user) {
    return null;
  }

  const hasActiveFilters =
    appliedFilters.category ||
    appliedFilters.minAmount !== undefined ||
    appliedFilters.maxAmount !== undefined ||
    appliedFilters.description ||
    appliedFilters.period ||
    appliedFilters.month !== undefined ||
    appliedFilters.year !== undefined ||
    appliedFilters.type ||
    (appliedDateRange?.from && appliedDateRange?.to);

  return (
    <>
    <TransactionsWrapper>
      <Header />
      <TransactionsMain>
        <TransactionsContent>
          <PageTitle>Todas as transações</PageTitle>

          <SearchAndFiltersContainer>
            <SearchInputWrapper>
              <SearchIcon size={16} $isLight={theme === 'light'} />
              <SearchInput
                type="text"
                placeholder="Buscar por descrição..."
                value={appliedFilters.description || ''}
                onChange={(e) => {
                  const description = e.target.value || undefined;
                  setAppliedFilters({
                    ...appliedFilters,
                    description,
                  });
                  setTempFilters({
                    ...tempFilters,
                    description,
                  });
                }}
              />
            </SearchInputWrapper>
            <FilterButton
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              $active={showFilters}
            >
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <FilterBadge $isLight={theme === 'light'}>
                  {Object.keys(appliedFilters).filter(
                    (key) =>
                      appliedFilters[key as keyof typeof appliedFilters] !== undefined &&
                      appliedFilters[key as keyof typeof appliedFilters] !== '',
                  ).length + (appliedDateRange?.from && appliedDateRange?.to ? 1 : 0)}
                </FilterBadge>
              )}
            </FilterButton>
            {hasActiveFilters && (
              <ClearFiltersButton type="button" onClick={handleClearFilters}>
                <X size={16} />
                Limpar filtros
              </ClearFiltersButton>
            )}
          </SearchAndFiltersContainer>

          {showFilters && (
            <FiltersSection>
              <FiltersGrid>
                <FilterGroup>
                  <FilterLabel>Período</FilterLabel>
                  <Select
                    value={tempFilters.period || 'all'}
                    onValueChange={(value) =>
                      setTempFilters({
                        ...tempFilters,
                        period: value === 'all' ? undefined : (value as Period),
                        month: undefined,
                        year: undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="this-month">Este mês</SelectItem>
                      <SelectItem value="last-month">Mês passado</SelectItem>
                      <SelectItem value="this-year">Este ano</SelectItem>
                      <SelectItem value="last-12-months">
                        Últimos 12 meses
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Data personalizada</FilterLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <DatePickerButton type="button">
                        <FilterInput
                          type="text"
                          readOnly
                          value={
                            tempDateRange?.from && tempDateRange?.to
                              ? `${format(tempDateRange.from, 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })} - ${format(tempDateRange.to, 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })}`
                              : 'Selecionar datas'
                          }
                        />
                      </DatePickerButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={tempDateRange}
                        onSelect={(range) => {
                          setTempDateRange(range);
                          if (range?.from && range?.to) {
                            setTempFilters({
                              ...tempFilters,
                              period: undefined,
                              month: undefined,
                              year: undefined,
                            });
                          }
                        }}
                        locale={ptBR}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Mês</FilterLabel>
                  <Select
                    value={tempFilters.month?.toString() || 'all'}
                    onValueChange={(value) =>
                      setTempFilters({
                        ...tempFilters,
                        month: value === 'all' ? undefined : parseInt(value, 10),
                        period: undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Ano</FilterLabel>
                  <Select
                    value={tempFilters.year?.toString() || 'all'}
                    onValueChange={(value) =>
                      setTempFilters({
                        ...tempFilters,
                        year: value === 'all' ? undefined : parseInt(value, 10),
                        period: undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Categoria</FilterLabel>
                  <Select
                    value={tempFilters.category || 'all'}
                    onValueChange={(value) =>
                      setTempFilters({
                        ...tempFilters,
                        category: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Tipo</FilterLabel>
                  <Select
                    value={tempFilters.type || 'all'}
                    onValueChange={(value) =>
                      setTempFilters({
                        ...tempFilters,
                        type: value === 'all' ? undefined : (value as 'income' | 'expense'),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel htmlFor="minAmount">Valor mínimo (R$)</FilterLabel>
                  <CurrencyInputWrapper>
                    <CurrencyPrefix $isLight={theme === 'light'}>R$</CurrencyPrefix>
                    <CurrencyInput
                      id="minAmount"
                      type="text"
                      placeholder="0,00"
                      value={minAmountDisplay}
                      onChange={handleMinAmountChange}
                      inputMode="numeric"
                    />
                  </CurrencyInputWrapper>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel htmlFor="maxAmount">Valor máximo (R$)</FilterLabel>
                  <CurrencyInputWrapper>
                    <CurrencyPrefix $isLight={theme === 'light'}>R$</CurrencyPrefix>
                    <CurrencyInput
                      id="maxAmount"
                      type="text"
                      placeholder="0,00"
                      value={maxAmountDisplay}
                      onChange={handleMaxAmountChange}
                      inputMode="numeric"
                    />
                  </CurrencyInputWrapper>
                </FilterGroup>
              </FiltersGrid>
              <FiltersActionsContainer>
                <ClearFiltersButton type="button" onClick={handleClearFilters}>
                  <X size={16} />
                  Remover filtros
                </ClearFiltersButton>
                <ApplyFiltersButton type="button" onClick={handleApplyFilters}>
                  Aplicar filtros
                </ApplyFiltersButton>
              </FiltersActionsContainer>
            </FiltersSection>
          )}

          <TransactionsTable>
            <TableHeader>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </TableHeader>
            <tbody>
              {isLoading ? (
                <>
                  {[...Array(10)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TransactionCell>
                      <TransactionCellContent>
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-32 ml-3" />
                        </TransactionCellContent>
                      </TransactionCell>
                      <TransactionCell>
                        <Skeleton className="h-4 w-24" />
                      </TransactionCell>
                      <TransactionCell>
                        <Skeleton className="h-4 w-20" />
                      </TransactionCell>
                      <TransactionCell>
                        <Skeleton className="h-4 w-16" />
                      </TransactionCell>
                      <TransactionCell>
                        <Skeleton className="h-4 w-4 rounded" />
                      </TransactionCell>
                      <TransactionCell>
                        <Skeleton className="h-4 w-4 rounded" />
                      </TransactionCell>
                    </TableRow>
                  ))}
                </>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TransactionCell>
                      <TransactionCellContent>
                        <CategoryIcon>
                          <IconRenderer
                            iconName={transaction.categoryIcon}
                            size={20}
                            color="currentColor"
                            fallback={<span>📁</span>}
                          />
                        </CategoryIcon>
                        <TransactionDescription>
                          {transaction.description}
                        </TransactionDescription>
                      </TransactionCellContent>
                    </TransactionCell>
                    <TransactionCell>
                      <TransactionMethod>{transaction.category}</TransactionMethod>
                    </TransactionCell>
                    <TransactionCell>
                      <TransactionDate>
                        {transaction.type === 'expense' && transaction.purchaseDate
                          ? (() => {
                              const dateParts = transaction.purchaseDate.split('-');
                              return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                            })()
                          : transaction.date}
                      </TransactionDate>
                    </TransactionCell>
                    <TransactionCell>
                      <TransactionDate>
                        {transaction.type === 'expense' && transaction.purchaseDate
                          ? transaction.date
                          : '-'}
                      </TransactionDate>
                    </TransactionCell>
                    <TransactionCell>
                      <TransactionAmount $type={transaction.type}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Math.abs(transaction.amount))}
                      </TransactionAmount>
                    </TransactionCell>
                    <TransactionCell>
                      <TransactionPaid $is_paid={transaction.is_paid} $type={transaction.type}>
                        {transaction.type === 'expense'
                          ? transaction.is_paid
                            ? 'Sim'
                            : 'Não'
                          : '-'}
                      </TransactionPaid>
                    </TransactionCell>
                    <TransactionCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <TransactionActions
                            type="button"
                            aria-label="Mais opções"
                          >
                            <MoreVertical size={16} />
                          </TransactionActions>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              transaction.type === 'income'
                                ? handleEditIncome(transaction.id)
                                : handleEditExpense(transaction.id)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              transaction.type === 'income'
                                ? handleDeleteIncome(transaction.id)
                                : handleDeleteExpense(transaction.id)
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TransactionCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableEmptyCell colSpan={5}>
                    <EmptyStateText>
                      {hasActiveFilters
                        ? 'Nenhuma transação encontrada com os filtros selecionados'
                        : 'Nenhuma transação encontrada'}
                    </EmptyStateText>
                  </TableEmptyCell>
                </TableRow>
              )}
            </tbody>
          </TransactionsTable>
        </TransactionsContent>
      </TransactionsMain>
      <AddIncomeModal
        open={isAddIncomeModalOpen}
        onOpenChange={(open) => {
          setIsAddIncomeModalOpen(open);
          if (!open) {
            setEditingIncomeId(null);
          }
        }}
        onSuccess={handleIncomeCreated}
        incomeId={editingIncomeId}
      />
      <AddExpenseModal
        open={isAddExpenseModalOpen}
        onOpenChange={(open) => {
          setIsAddExpenseModalOpen(open);
          if (!open) {
            setEditingExpenseId(null);
          }
        }}
        onSuccess={handleExpenseCreated}
        expenseId={editingExpenseId}
      />
    </TransactionsWrapper>

    <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir grupo de despesas</AlertDialogTitle>
          <AlertDialogDescription>
            Esta despesa faz parte de um grupo parcelado. Deseja excluir apenas esta parcela ou todo o grupo?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleDeleteGroupConfirm(false)}>
            Apenas esta parcela
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDeleteGroupConfirm(true)}>
            Todo o grupo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
