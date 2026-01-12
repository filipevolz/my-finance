import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Moon,
  Sun,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Logo } from '../../components/Logo';
import { AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddIncomeModal } from '../../components/AddIncomeModal';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { incomesService } from '../../services/incomes.service';
import { expensesService } from '../../services/expenses.service';
import { IconRenderer } from '../../utils/iconMapper';
import {
  DashboardWrapper,
  DashboardHeader,
  NavMenu,
  NavItem,
  HeaderActions,
  IconButton,
  DashboardMain,
  DashboardContent,
  WelcomeSection,
  WelcomeTitle,
  PeriodSelector,
  PeriodButton,
  PeriodSelectButton,
  StatsGrid,
  StatCard,
  StatCardHeader,
  StatCardTitle,
  StatCardValue,
  StatCardChange,
  ActionCardsGrid,
  ActionCard,
  ActionCardIcon,
  ActionCardTitle,
  ActionCardDescription,
  BottomSection,
  ExpensesByCategoryCard,
  CategoryChartContainer,
  CategoryLegend,
  CategoryItem,
  CategoryIcon,
  CategoryInfo,
  CategoryPercentage,
  TransactionsCard,
  TransactionsTable,
  TableHeader,
  TableRow,
  TransactionCell,
  TransactionDescription,
  TransactionMethod,
  TransactionDate,
  TransactionAmount,
  TransactionActions,
  TableEmptyCell,
  EmptyStateText,
  TransactionCellContent,
  StyledAvatar,
} from './styles';

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-12-months';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('this-month');
  const [activeNav, setActiveNav] = useState('overview');
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    balance: 0,
    balanceChange: 0,
    income: 0,
    incomeChange: 0,
    expense: 0,
    expenseChange: 0,
  });
  const [categories, setCategories] = useState<
    Array<{
      name: string;
      percentage: number;
      color: string;
      icon: string | null;
      value: number;
    }>
  >([]);
  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      description: string;
      categoryIcon: string;
      category: string;
      date: string;
      amount: number;
      type: 'income' | 'expense';
    }>
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loadStats = useCallback(async () => {
    try {
      const response = await incomesService.getStats(selectedPeriod);
      // Converter centavos para reais
      const statsInReais = {
        balance: response.data.balance / 100,
        balanceChange: response.data.balanceChange,
        income: response.data.income / 100,
        incomeChange: response.data.incomeChange,
        expense: response.data.expense / 100,
        expenseChange: response.data.expenseChange,
      };
      setStats(statsInReais);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, [selectedPeriod]);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const response = await expensesService.getByCategory(selectedPeriod);
      // Converter centavos para reais
      const categoriesInReais = response.data.map((cat) => ({
        ...cat,
        value: cat.value / 100,
      }));
      setCategories(categoriesInReais);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedPeriod]);

  const loadTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await incomesService.getLatestTransactions(10);
      // Converter centavos para reais e formatar data sem problemas de timezone
      const transactionsInReais = response.data.map((trans) => {
        // Converter data YYYY-MM-DD para DD/MM/YYYY sem problemas de timezone
        const dateParts = trans.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        
        return {
          id: trans.id,
          description: trans.description,
          categoryIcon: trans.categoryIcon,
          category: trans.category,
          date: formattedDate,
          amount: trans.amount / 100,
          type: trans.type,
        };
      });
      setTransactions(transactionsInReais);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      void loadStats();
      void loadCategories();
      void loadTransactions();
    }
  }, [isAuthenticated, isLoading, loadStats, loadCategories, loadTransactions]);

  const handleIncomeCreated = () => {
    loadStats();
    loadCategories();
    loadTransactions();
    setEditingIncomeId(null);
  };

  const handleEditIncome = (incomeId: string) => {
    setEditingIncomeId(incomeId);
    setIsAddIncomeModalOpen(true);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (
      !confirm('Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.')
    ) {
      return;
    }

    try {
      await incomesService.delete(incomeId);
      loadStats();
      loadCategories();
      loadTransactions();
    } catch (error) {
      console.error('Erro ao excluir receita:', error);
      alert('Erro ao excluir receita. Tente novamente.');
    }
  };

  const handleExpenseCreated = () => {
    loadStats();
    loadCategories();
    loadTransactions();
    setEditingExpenseId(null);
  };

  const handleEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId);
    setIsAddExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (
      !confirm('Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.')
    ) {
      return;
    }

    try {
      await expensesService.delete(expenseId);
      loadStats();
      loadCategories();
      loadTransactions();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      alert('Erro ao excluir despesa. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <DashboardWrapper>
        <DashboardMain>
          <DashboardContent>
            <WelcomeTitle>Carregando...</WelcomeTitle>
          </DashboardContent>
        </DashboardMain>
      </DashboardWrapper>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardWrapper>
      <DashboardHeader>
        <Logo size="medium" />
        <NavMenu>
          <NavItem
            $active={activeNav === 'overview'}
            onClick={() => setActiveNav('overview')}
          >
            Overview
          </NavItem>
          <NavItem
            $active={activeNav === 'transactions'}
            onClick={() => setActiveNav('transactions')}
          >
            Transactions
          </NavItem>
          <NavItem
            $active={activeNav === 'analytics'}
            onClick={() => setActiveNav('analytics')}
          >
            Analytics
          </NavItem>
          <NavItem
            $active={activeNav === 'accounts'}
            onClick={() => setActiveNav('accounts')}
          >
            Accounts
          </NavItem>
          <NavItem
            $active={activeNav === 'wallet'}
            onClick={() => setActiveNav('wallet')}
          >
            Wallet
          </NavItem>
        </NavMenu>
        <HeaderActions>
          <IconButton
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
            }
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </IconButton>
          <IconButton type="button" aria-label="Notificações">
            <Bell size={20} />
          </IconButton>
          <IconButton type="button" aria-label="Configurações">
            <Settings size={20} />
          </IconButton>
          <StyledAvatar>
            <AvatarFallback>
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </StyledAvatar>
        </HeaderActions>
      </DashboardHeader>
      <DashboardMain>
        <DashboardContent>
          <WelcomeSection>
            <WelcomeTitle>
              Olá, {user.name.split(' ')[0]}!
            </WelcomeTitle>
            <PeriodSelector>
              <PeriodButton
                $active={selectedPeriod === 'this-month'}
                onClick={() => setSelectedPeriod('this-month')}
              >
                Este mês
              </PeriodButton>
              <PeriodButton
                $active={selectedPeriod === 'last-month'}
                onClick={() => setSelectedPeriod('last-month')}
              >
                Mês passado
              </PeriodButton>
              <PeriodButton
                $active={selectedPeriod === 'this-year'}
                onClick={() => setSelectedPeriod('this-year')}
              >
                Este ano
              </PeriodButton>
              <PeriodSelectButton
                onClick={() => setSelectedPeriod('last-12-months')}
              >
                <Calendar size={16} />
                Últimos 12 meses
              </PeriodSelectButton>
            </PeriodSelector>
          </WelcomeSection>

          <StatsGrid>
            <StatCard>
              <StatCardHeader>
                <StatCardTitle>Balanço</StatCardTitle>
                <StatCardChange $positive={stats.balanceChange >= 0}>
                  {stats.balanceChange >= 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {stats.balanceChange >= 0 ? '+' : ''}
                  {stats.balanceChange}%
                </StatCardChange>
              </StatCardHeader>
              <StatCardValue $positive={stats.balance >= 0}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.balance)}
              </StatCardValue>
            </StatCard>

            <StatCard>
              <StatCardHeader>
                <StatCardTitle>Receitas</StatCardTitle>
                <StatCardChange $positive={stats.incomeChange >= 0}>
                  {stats.incomeChange >= 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {stats.incomeChange >= 0 ? '+' : ''}
                  {stats.incomeChange}%
                </StatCardChange>
              </StatCardHeader>
              <StatCardValue $positive={true}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.income)}
              </StatCardValue>
            </StatCard>

            <StatCard>
              <StatCardHeader>
                <StatCardTitle>Despesas</StatCardTitle>
                <StatCardChange $positive={stats.expenseChange <= 0}>
                  {stats.expenseChange >= 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {stats.expenseChange >= 0 ? '+' : ''}
                  {stats.expenseChange}%
                </StatCardChange>
              </StatCardHeader>
              <StatCardValue $positive={false}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.expense)}
              </StatCardValue>
            </StatCard>
          </StatsGrid>

          <ActionCardsGrid>
            <ActionCard
              type="button"
              onClick={() => setIsAddIncomeModalOpen(true)}
            >
              <ActionCardIcon $color="#4ade80">
                <Plus size={24} />
              </ActionCardIcon>
              <div>
                <ActionCardTitle>Adicionar receita</ActionCardTitle>
                <ActionCardDescription>
                  Criar uma receita manualmente
                </ActionCardDescription>
              </div>
            </ActionCard>

            <ActionCard
              type="button"
              onClick={() => setIsAddExpenseModalOpen(true)}
            >
              <ActionCardIcon $color="#ef4444">
                <Minus size={24} />
              </ActionCardIcon>
              <div>
                <ActionCardTitle>Adicionar despesa</ActionCardTitle>
                <ActionCardDescription>
                  Criar uma despesa manualmente
                </ActionCardDescription>
              </div>
            </ActionCard>
          </ActionCardsGrid>

          <BottomSection>
            <ExpensesByCategoryCard>
              <h2>Despesas por categoria</h2>
              {categories.length > 0 ? (
              <CategoryChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CategoryChartContainer>
              ) : (
                <EmptyStateText>Nenhuma despesa encontrada</EmptyStateText>
              )}
              <CategoryLegend>
                {isLoadingCategories ? (
                  <>
                    {[...Array(5)].map((_, index) => (
                      <CategoryItem key={`skeleton-${index}`}>
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <CategoryInfo>
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-12" />
                        </CategoryInfo>
                      </CategoryItem>
                    ))}
                  </>
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <CategoryItem key={category.name}>
                      <CategoryIcon $color={category.color}>
                        <IconRenderer
                          iconName={category.icon}
                          size={20}
                          fallback={<span>📁</span>}
                        />
                      </CategoryIcon>
                      <CategoryInfo>
                        <span>{category.name}</span>
                        <CategoryPercentage>
                          {category.percentage.toFixed(2)}%
                        </CategoryPercentage>
                      </CategoryInfo>
                    </CategoryItem>
                  ))
                ) : null}
              </CategoryLegend>
            </ExpensesByCategoryCard>

            <TransactionsCard>
              <div>
                <h2>Últimas transações</h2>
                <p>Verifique suas últimas transações</p>
              </div>
              <TransactionsTable>
                <TableHeader>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th></th>
                </TableHeader>
                <tbody>
                  {isLoadingTransactions ? (
                    <>
                      {[...Array(5)].map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TransactionCell>
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-32 ml-3" />
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
                          <TransactionMethod>
                            {transaction.category}
                          </TransactionMethod>
                        </TransactionCell>
                        <TransactionCell>
                          <TransactionDate>{transaction.date}</TransactionDate>
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
                          Nenhuma transação encontrada
                        </EmptyStateText>
                      </TableEmptyCell>
                    </TableRow>
                  )}
                </tbody>
              </TransactionsTable>
            </TransactionsCard>
          </BottomSection>
        </DashboardContent>
      </DashboardMain>
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
    </DashboardWrapper>
  );
}
