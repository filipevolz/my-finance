import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, formatMonthYear, formatPercentage } from '../../utils/formatters';
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Header } from '../../components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { incomesService } from '../../services/incomes.service';
import { IconRenderer } from '../../utils/iconMapper';
import {
  AnalyticsWrapper,
  AnalyticsMain,
  AnalyticsContent,
  PageTitle,
  Section,
  SectionTitle,
  SectionDescription,
  PeriodSelector,
  PeriodButton,
  Card,
  ChartContainer,
  InsightCard,
  InsightText,
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableHeaderCell,
  HealthScoreCard,
  ScoreValue,
  ScoreLabel,
  ScoreDetails,
  ScoreDetailItem,
  InsightsList,
  InsightItem,
  HeatmapContainer,
  HeatmapDay,
  HeatmapLabel,
  RecurringExpenseItem,
  RecurringExpenseName,
  RecurringExpenseDetails,
  ComparisonCardsGrid,
  ComparisonCard,
  ComparisonLabel,
  ComparisonValue,
  ComparisonChange,
  VillainsList,
} from './styles';

type EvolutionPeriod = '6-months' | '12-months' | 'this-year' | 'last-year';

export function Analytics() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  const [evolutionPeriod, setEvolutionPeriod] =
    useState<EvolutionPeriod>('12-months');
  const [monthlyEvolution, setMonthlyEvolution] = useState<
    Array<{
      month: string;
      income: number;
      expense: number;
      balance: number;
    }>
  >([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<
    Array<{
      category: string;
      averageMonthly: number;
      lastMonth: number;
      variation: number;
      mostExpensiveMonth: { month: string; value: number };
      icon: string | null;
      color: string;
    }>
  >([]);
  const [recurringExpenses, setRecurringExpenses] = useState<
    Array<{
      name: string;
      amount: number;
      frequency: string;
      annualImpact: number;
      category: string;
    }>
  >([]);
  const [incomeSources, setIncomeSources] = useState<{
    sources: Array<{
      category: string;
      name: string | null;
      sourceLabel: string;
      total: number;
      percentage: number;
      count: number;
    }>;
    totalIncome: number;
    mainSourcePercentage: number;
    sourceCount: number;
  } | null>(null);
  const [consumptionPattern, setConsumptionPattern] = useState<{
    byDayOfWeek: Array<{ day: string; total: number; count: number }>;
    byDayOfMonth: Array<{ day: number; total: number; count: number }>;
  } | null>(null);
  const [financialHealth, setFinancialHealth] = useState<{
    score: number;
    details: {
      expenseRatio: number;
      positiveMonths: number;
      positiveMonthsPercentage: number;
      recurringExpenseRatio: number;
    };
    insights: string[];
  } | null>(null);
  const [periodComparison, setPeriodComparison] = useState<{
    current: {
      income: number;
      expense: number;
      balance: number;
    };
    previous: {
      income: number;
      expense: number;
      balance: number;
    };
    changes: {
      incomeChange: number;
      expenseChange: number;
      balanceChange: number;
    };
  } | null>(null);
  const [budgetSuggestion, setBudgetSuggestion] = useState<{
    categories: Array<{
      category: string;
      suggestedBudget: number;
      currentSpent: number;
      difference: number;
      percentage: number;
    }>;
    totalSuggested: number;
    totalSpent: number;
    totalDifference: number;
  } | null>(null);
  const [topVillains, setTopVillains] = useState<{
    biggestCategoryIncrease: {
      category: string;
      current: number;
      previous: number;
      increase: number;
    } | null;
    heaviestRecurringExpense: {
      name: string;
      amount: number;
      annualImpact: number;
      category: string;
    } | null;
    biggestSingleExpense: {
      name: string | null;
      category: string;
      amount: number;
      date: string;
    } | null;
  } | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loadMonthlyEvolution = useCallback(async () => {
    try {
      const months =
        evolutionPeriod === '6-months'
          ? 6
          : evolutionPeriod === '12-months'
            ? 12
            : evolutionPeriod === 'this-year'
              ? new Date().getMonth() + 1
              : 12;
      const response = await incomesService.getMonthlyEvolution(months);
      const data = response.data.map((item) => ({
        ...item,
        month: formatMonthYear(item.month),
      }));
      setMonthlyEvolution(data);
    } catch (error) {
      console.error('Erro ao carregar evolução mensal:', error);
    }
  }, [evolutionPeriod]);

  const loadCategoryAnalysis = useCallback(async () => {
    try {
      const response = await incomesService.getCategoryExpenseAnalysis(6);
      setCategoryAnalysis(response.data);
    } catch (error) {
      console.error('Erro ao carregar análise de categorias:', error);
    }
  }, []);

  const loadRecurringExpenses = useCallback(async () => {
    try {
      const response = await incomesService.getRecurringExpenses();
      setRecurringExpenses(response.data);
    } catch (error) {
      console.error('Erro ao carregar gastos recorrentes:', error);
    }
  }, []);

  const loadIncomeSources = useCallback(async () => {
    try {
      const response = await incomesService.getIncomeSourcesAnalysis();
      setIncomeSources(response.data);
    } catch (error) {
      console.error('Erro ao carregar fontes de receita:', error);
    }
  }, []);

  const loadConsumptionPattern = useCallback(async () => {
    try {
      const response = await incomesService.getConsumptionPattern(3);
      setConsumptionPattern(response.data);
    } catch (error) {
      console.error('Erro ao carregar padrão de consumo:', error);
    }
  }, []);

  const loadFinancialHealth = useCallback(async () => {
    try {
      const response = await incomesService.getFinancialHealthScore();
      setFinancialHealth(response.data);
    } catch (error) {
      console.error('Erro ao carregar saúde financeira:', error);
    }
  }, []);

  const loadPeriodComparison = useCallback(async () => {
    try {
      const response = await incomesService.getPeriodComparison();
      setPeriodComparison(response.data);
    } catch (error) {
      console.error('Erro ao carregar comparação de períodos:', error);
    }
  }, []);

  const loadBudgetSuggestion = useCallback(async () => {
    try {
      const response = await incomesService.getBudgetSuggestion();
      setBudgetSuggestion(response.data);
    } catch (error) {
      console.error('Erro ao carregar sugestão de orçamento:', error);
    }
  }, []);

  const loadTopVillains = useCallback(async () => {
    try {
      const response = await incomesService.getTopVillains();
      setTopVillains(response.data);
    } catch (error) {
      console.error('Erro ao carregar top vilões:', error);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoadingData(true);
    await Promise.all([
      loadMonthlyEvolution(),
      loadCategoryAnalysis(),
      loadRecurringExpenses(),
      loadIncomeSources(),
      loadConsumptionPattern(),
      loadFinancialHealth(),
      loadPeriodComparison(),
      loadBudgetSuggestion(),
      loadTopVillains(),
    ]);
    setIsLoadingData(false);
  }, [
    loadMonthlyEvolution,
    loadCategoryAnalysis,
    loadRecurringExpenses,
    loadIncomeSources,
    loadConsumptionPattern,
    loadFinancialHealth,
    loadPeriodComparison,
    loadBudgetSuggestion,
    loadTopVillains,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadMonthlyEvolution();
    }
  }, [isAuthenticated, loadMonthlyEvolution]);

  // Calcular insights automáticos (memoizados) - ANTES de qualquer retorno condicional
  const positiveMonths = useMemo(() => {
    return monthlyEvolution.filter((m) => m.balance > 0).length;
  }, [monthlyEvolution]);

  const totalMonths = useMemo(() => {
    return monthlyEvolution.length;
  }, [monthlyEvolution]);

  const positiveMonthsPercentage = useMemo(() => {
    return totalMonths > 0 ? (positiveMonths / totalMonths) * 100 : 0;
  }, [positiveMonths, totalMonths]);

  if (isLoading) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Ruim';
  };

  return (
    <AnalyticsWrapper $theme={theme}>
      <Header />
      <AnalyticsMain>
        <AnalyticsContent>
          <PageTitle>Análises</PageTitle>

          {/* 1. Evolução Financeira no Tempo */}
          <Section>
            <SectionTitle>Evolução Financeira no Tempo</SectionTitle>
            <SectionDescription>
              Acompanhe sua evolução financeira ao longo do tempo
            </SectionDescription>
            <PeriodSelector>
              <PeriodButton
                type="button"
                $active={evolutionPeriod === '6-months'}
                onClick={() => setEvolutionPeriod('6-months')}
              >
                Últimos 6 meses
              </PeriodButton>
              <PeriodButton
                type="button"
                $active={evolutionPeriod === '12-months'}
                onClick={() => setEvolutionPeriod('12-months')}
              >
                Últimos 12 meses
              </PeriodButton>
              <PeriodButton
                type="button"
                $active={evolutionPeriod === 'this-year'}
                onClick={() => setEvolutionPeriod('this-year')}
              >
                Ano atual
              </PeriodButton>
              <PeriodButton
                type="button"
                $active={evolutionPeriod === 'last-year'}
                onClick={() => setEvolutionPeriod('last-year')}
              >
                Ano anterior
              </PeriodButton>
            </PeriodSelector>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyEvolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          value !== undefined ? formatCurrency(value) : ''
                        }
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stackId="1"
                        stroke="#4ade80"
                        fill="#4ade80"
                        name="Receitas"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        name="Despesas"
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Resultado"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
                {totalMonths > 0 && (
                  <InsightCard>
                    <InsightText>
                      Você fechou {positiveMonths} dos últimos {totalMonths}{' '}
                      meses no positivo (
                      {positiveMonthsPercentage.toFixed(0)}%)
                    </InsightText>
                  </InsightCard>
                )}
              </Card>
            )}
          </Section>

          {/* 1.1 Comparação "Você vs Você mesmo" */}
          <Section>
            <SectionTitle>Você vs Você Mesmo</SectionTitle>
            <SectionDescription>
              Comparação deste mês com o mês anterior
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-32 w-full" />
            ) : periodComparison ? (
              <ComparisonCardsGrid>
                <ComparisonCard>
                  <ComparisonLabel>Receita</ComparisonLabel>
                  <ComparisonValue>
                    {formatCurrency(periodComparison.current.income)}
                  </ComparisonValue>
                  <ComparisonChange
                    $isPositive={periodComparison.changes.incomeChange >= 0}
                  >
                    {formatPercentage(periodComparison.changes.incomeChange)}
                  </ComparisonChange>
                </ComparisonCard>
                <ComparisonCard>
                  <ComparisonLabel>Despesa</ComparisonLabel>
                  <ComparisonValue>
                    {formatCurrency(periodComparison.current.expense)}
                  </ComparisonValue>
                  <ComparisonChange
                    $isPositive={periodComparison.changes.expenseChange <= 0}
                  >
                    {formatPercentage(periodComparison.changes.expenseChange)}
                  </ComparisonChange>
                </ComparisonCard>
                <ComparisonCard>
                  <ComparisonLabel>Saldo</ComparisonLabel>
                  <ComparisonValue>
                    {formatCurrency(periodComparison.current.balance)}
                  </ComparisonValue>
                  <ComparisonChange
                    $isPositive={periodComparison.changes.balanceChange >= 0}
                  >
                    {formatPercentage(periodComparison.changes.balanceChange)}
                  </ComparisonChange>
                </ComparisonCard>
              </ComparisonCardsGrid>
            ) : null}
          </Section>

          {/* 1.2 Orçamento vs Real */}
          <Section>
            <SectionTitle>Orçamento vs Real</SectionTitle>
            <SectionDescription>
              Orçamento sugerido baseado na média dos últimos 3 meses
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : budgetSuggestion ? (
              <Card>
                {budgetSuggestion.categories
                  .filter((cat) => cat.difference > 0)
                  .slice(0, 5)
                  .map((category) => (
                    <InsightCard key={category.category}>
                      <InsightText>
                        <strong>Você ultrapassou o orçamento sugerido em {category.category}</strong>
                        <br />
                        Orçamento sugerido: {formatCurrency(category.suggestedBudget)} | 
                        Gasto atual: {formatCurrency(category.currentSpent)} | 
                        Diferença: +{formatCurrency(category.difference)} ({category.percentage.toFixed(0)}%)
                      </InsightText>
                    </InsightCard>
                  ))}
                {budgetSuggestion.categories.filter((cat) => cat.difference > 0).length === 0 && (
                  <InsightText>
                    Parabéns! Você está dentro do orçamento sugerido em todas as categorias.
                  </InsightText>
                )}
              </Card>
            ) : null}
          </Section>

          {/* 1.3 Top 3 Vilões do Mês */}
          <Section>
            <SectionTitle>Top 3 Vilões do Mês</SectionTitle>
            <SectionDescription>
              Os principais responsáveis pelos seus gastos
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : topVillains ? (
              <Card>
                <VillainsList>
                  {topVillains.biggestCategoryIncrease && (
                    <InsightCard>
                      <InsightText>
                        <strong>📈 Categoria que mais cresceu:</strong> {topVillains.biggestCategoryIncrease.category}
                        <br />
                        Aumento de {topVillains.biggestCategoryIncrease.increase.toFixed(1)}% 
                        ({formatCurrency(topVillains.biggestCategoryIncrease.previous)} → {formatCurrency(topVillains.biggestCategoryIncrease.current)})
                      </InsightText>
                    </InsightCard>
                  )}
                  {topVillains.heaviestRecurringExpense && (
                    <InsightCard>
                      <InsightText>
                        <strong>💳 Gasto recorrente mais pesado:</strong> {topVillains.heaviestRecurringExpense.name}
                        <br />
                        Valor: {formatCurrency(topVillains.heaviestRecurringExpense.amount)} | 
                        Impacto anual: {formatCurrency(topVillains.heaviestRecurringExpense.annualImpact)}
                      </InsightText>
                    </InsightCard>
                  )}
                  {topVillains.biggestSingleExpense && (
                    <InsightCard>
                      <InsightText>
                        <strong>💸 Maior despesa isolada:</strong> {topVillains.biggestSingleExpense.name || 'Sem nome'} ({topVillains.biggestSingleExpense.category})
                        <br />
                        Valor: {formatCurrency(topVillains.biggestSingleExpense.amount)} | 
                        Data: {formatDate(topVillains.biggestSingleExpense.date)}
                      </InsightText>
                    </InsightCard>
                  )}
                </VillainsList>
              </Card>
            ) : null}
          </Section>

          {/* 2. Análise de Gastos por Categoria */}
          <Section>
            <SectionTitle>Análise de Gastos por Categoria</SectionTitle>
            <SectionDescription>
              Evolução e variação dos gastos por categoria
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Categoria</TableHeaderCell>
                      <TableHeaderCell>Média Mensal</TableHeaderCell>
                      <TableHeaderCell>Último Mês</TableHeaderCell>
                      <TableHeaderCell>Variação</TableHeaderCell>
                      <TableHeaderCell>Mês Mais Caro</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <tbody>
                    {categoryAnalysis.map((item) => (
                      <TableRow key={item.category}>
                        <TableCell>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.icon && (
                              <IconRenderer iconName={item.icon} size={20} />
                            )}
                            {item.category}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.averageMonthly)}</TableCell>
                        <TableCell>{formatCurrency(item.lastMonth)}</TableCell>
                        <TableCell
                          style={{
                            color:
                              item.variation > 0
                                ? '#ef4444'
                                : item.variation < 0
                                  ? '#4ade80'
                                  : 'inherit',
                          }}
                        >
                          {item.variation > 0 ? '+' : ''}
                          {item.variation.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                        {formatMonthYear(item.mostExpensiveMonth.month)}{' '}
                        - {formatCurrency(item.mostExpensiveMonth.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </Section>

          {/* 3. Gastos Recorrentes */}
          <Section>
            <SectionTitle>Gastos Recorrentes Detectados</SectionTitle>
            <SectionDescription>
              Gastos que se repetem regularmente e seu impacto anual
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                {recurringExpenses.length === 0 ? (
                  <p>Nenhum gasto recorrente detectado</p>
                ) : (
                  <>
                    {recurringExpenses.map((expense) => (
                      <RecurringExpenseItem key={expense.name}>
                        <RecurringExpenseName>{expense.name}</RecurringExpenseName>
                        <RecurringExpenseDetails>
                          <div>
                            <strong>Valor:</strong> {formatCurrency(expense.amount)}
                          </div>
                          <div>
                            <strong>Frequência:</strong>{' '}
                            {expense.frequency === 'weekly'
                              ? 'Semanal'
                              : expense.frequency === 'biweekly'
                                ? 'Quinzenal'
                                : expense.frequency === 'monthly'
                                  ? 'Mensal'
                                  : 'Irregular'}
                          </div>
                          <div>
                            <strong>Impacto Anual:</strong>{' '}
                            {formatCurrency(expense.annualImpact)}
                          </div>
                          <div>
                            <strong>Categoria:</strong> {expense.category}
                          </div>
                        </RecurringExpenseDetails>
                      </RecurringExpenseItem>
                    ))}
                    {incomeSources && (
                      <InsightCard style={{ marginTop: '1.5rem' }}>
                        <InsightText>
                          Esses gastos representam{' '}
                          {incomeSources.totalIncome > 0
                            ? (
                                (recurringExpenses.reduce(
                                  (sum, e) => sum + e.annualImpact,
                                  0,
                                ) /
                                  12 /
                                  (incomeSources.totalIncome /
                                    Math.max(monthlyEvolution.length, 1))) *
                                100
                              ).toFixed(0)
                            : 0}
                          % da sua renda mensal
                        </InsightText>
                      </InsightCard>
                    )}
                  </>
                )}
              </Card>
            )}
          </Section>

          {/* 4. Análise de Fontes de Receita */}
          <Section>
            <SectionTitle>Análise de Fontes de Receita</SectionTitle>
            <SectionDescription>
              Distribuição e dependência das suas fontes de receita
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : incomeSources ? (
              <Card>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeSources.sources.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sourceLabel" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          value !== undefined ? formatCurrency(value) : ''
                        }
                      />
                      <Legend />
                      <Bar dataKey="total" fill="#4ade80" name="Total (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <InsightCard>
                  <InsightText>
                    {incomeSources.sourceCount} fonte(s) de receita detectada(s)
                  </InsightText>
                  <InsightText>
                    {incomeSources.mainSourcePercentage.toFixed(1)}% da sua renda
                    vem de uma única fonte
                    {incomeSources.mainSourcePercentage > 80 && (
                      <span style={{ color: '#f59e0b' }}>
                        {' '}
                        (alta dependência)
                      </span>
                    )}
                  </InsightText>
                </InsightCard>
              </Card>
            ) : null}
          </Section>

          {/* 5. Padrão de Consumo */}
          <Section>
            <SectionTitle>Padrão de Consumo no Tempo</SectionTitle>
            <SectionDescription>
              Quando você mais gasta durante a semana e o mês
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : consumptionPattern ? (
              <Card>
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Por Dia da Semana</h3>
                  <HeatmapContainer>
                    {consumptionPattern.byDayOfWeek.map((day) => {
                      const maxTotal = Math.max(
                        ...consumptionPattern.byDayOfWeek.map((d) => d.total),
                      );
                      const intensity = maxTotal > 0 ? day.total / maxTotal : 0;
                      return (
                        <div key={day.day} style={{ textAlign: 'center' }}>
                          <HeatmapLabel>{day.day}</HeatmapLabel>
                          <HeatmapDay $intensity={intensity}>
                            {formatCurrency(day.total)}
                          </HeatmapDay>
                        </div>
                      );
                    })}
                  </HeatmapContainer>
                </div>
              </Card>
            ) : null}
          </Section>

          {/* 6. Saúde Financeira */}
          <Section>
            <SectionTitle>Saúde Financeira</SectionTitle>
            <SectionDescription>
              Score e análise da sua situação financeira
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : financialHealth ? (
              <Card>
                <HealthScoreCard>
                  <ScoreValue $color={getScoreColor(financialHealth.score)}>
                    {financialHealth.score}
                  </ScoreValue>
                  <ScoreLabel>{getScoreLabel(financialHealth.score)}</ScoreLabel>
                  <ScoreDetails>
                    <ScoreDetailItem>
                      <strong>Gastos sobre receita:</strong>{' '}
                      {financialHealth.details.expenseRatio.toFixed(1)}%
                    </ScoreDetailItem>
                    <ScoreDetailItem>
                      <strong>Meses positivos:</strong>{' '}
                      {financialHealth.details.positiveMonths} (
                      {financialHealth.details.positiveMonthsPercentage.toFixed(0)}%)
                    </ScoreDetailItem>
                    <ScoreDetailItem>
                      <strong>Gastos recorrentes sobre renda:</strong>{' '}
                      {financialHealth.details.recurringExpenseRatio.toFixed(1)}%
                    </ScoreDetailItem>
                  </ScoreDetails>
                  <InsightsList>
                    {financialHealth.insights.map((insight, index) => (
                      <InsightItem key={index}>{insight}</InsightItem>
                    ))}
                  </InsightsList>
                </HealthScoreCard>
              </Card>
            ) : null}
          </Section>

          {/* 7. Insights Automáticos */}
          {!isLoadingData && (
            <Section>
              <SectionTitle>Insights Automáticos</SectionTitle>
              <SectionDescription>
                Análises inteligentes sobre seus hábitos financeiros
              </SectionDescription>
              <Card>
                <InsightsList>
                  {monthlyEvolution.length > 0 && (
                    <>
                      {(() => {
                        const avgExpense =
                          monthlyEvolution.reduce(
                            (sum, m) => sum + m.expense,
                            0,
                          ) / monthlyEvolution.length;
                        const lastMonthExpense = monthlyEvolution[
                          monthlyEvolution.length - 1
                        ]?.expense || 0;
                        if (lastMonthExpense > avgExpense * 1.1) {
                          return (
                            <InsightItem key="expense-increase">
                              Você gastou mais este mês do que sua média
                              histórica (+
                              {(
                                ((lastMonthExpense - avgExpense) / avgExpense) *
                                100
                              ).toFixed(0)}
                              %)
                            </InsightItem>
                          );
                        }
                        return null;
                      })()}
                      {categoryAnalysis.length > 0 && (
                        <>
                          {(() => {
                            const maxIncrease = categoryAnalysis.reduce(
                              (max, cat) =>
                                cat.variation > max.variation ? cat : max,
                              categoryAnalysis[0],
                            );
                            if (maxIncrease.variation > 10) {
                              return (
                                <InsightItem key="category-increase">
                                  Seu maior aumento foi em {maxIncrease.category}{' '}
                                  (+{maxIncrease.variation.toFixed(0)}%)
                                </InsightItem>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                      {monthlyEvolution.length > 1 && (
                        <>
                          {(() => {
                            const incomeGrowth =
                              ((monthlyEvolution[monthlyEvolution.length - 1]
                                ?.income || 0) -
                                (monthlyEvolution[monthlyEvolution.length - 2]
                                  ?.income || 0)) /
                              (monthlyEvolution[monthlyEvolution.length - 2]
                                ?.income || 1);
                            const expenseGrowth =
                              ((monthlyEvolution[monthlyEvolution.length - 1]
                                ?.expense || 0) -
                                (monthlyEvolution[monthlyEvolution.length - 2]
                                  ?.expense || 0)) /
                              (monthlyEvolution[monthlyEvolution.length - 2]
                                ?.expense || 1);
                            if (expenseGrowth > incomeGrowth && incomeGrowth > 0) {
                              return (
                                <InsightItem key="growth-comparison">
                                  Seus gastos cresceram mais rápido que sua
                                  renda
                                </InsightItem>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                    </>
                  )}
                </InsightsList>
              </Card>
            </Section>
          )}
        </AnalyticsContent>
      </AnalyticsMain>
    </AnalyticsWrapper>
  );
}
