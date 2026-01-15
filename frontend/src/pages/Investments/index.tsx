import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Header } from '../../components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { investmentsService, type Position, type MonthlyEvolution } from '../../services/investments.service';
import { formatCurrency, formatMonthYear, formatPercentage } from '../../utils/formatters';
import { AddInvestmentOperationModal } from '../../components/AddInvestmentOperationModal';
import {
  InvestmentsWrapper,
  InvestmentsMain,
  InvestmentsContent,
  PageTitle,
  PageHeader,
  ActionButton,
  Section,
  SectionTitle,
  SectionDescription,
  Card,
  ChartContainer,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableHeaderCell,
  PositionCard,
  PositionHeader,
  PositionValue,
  PositionChange,
  EmptyStateText,
  InsightCard,
  InsightText,
  GroupSelector,
  GroupButton,
} from './styles';

type ViewMode = 'value' | 'percentage';

export function Investments() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  const [isAddOperationModalOpen, setIsAddOperationModalOpen] = useState(false);
  const [editingOperationId, setEditingOperationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('value');
  const [groupBy, setGroupBy] = useState<'none' | 'assetClass' | 'broker' | 'currency'>('none');

  const [positions, setPositions] = useState<Position[]>([]);
  const [monthlyEvolution, setMonthlyEvolution] = useState<MonthlyEvolution[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [positionResponse, evolutionResponse] = await Promise.all([
        investmentsService.getCurrentPosition(),
        investmentsService.getMonthlyEvolution(),
      ]);
      setPositions(positionResponse.data);
      setMonthlyEvolution(evolutionResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados de investimentos:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadData();
    }
  }, [isAuthenticated, loadData]);

  // Calcular totais (memoizados)
  const totalPortfolioValue = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.currentValue, 0);
  }, [positions]);

  const totalInvested = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.totalInvested, 0);
  }, [positions]);

  const totalProfit = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.profit, 0);
  }, [positions]);

  const totalProfitPercentage = useMemo(() => {
    return totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  }, [totalProfit, totalInvested]);

  // Preparar dados do gráfico
  const chartData = useMemo(() => {
    return monthlyEvolution.map((item) => ({
      month: formatMonthYear(item.month),
      portfolioValue: item.portfolioValue,
      portfolioPercentage: item.returns,
      contributions: item.contributions,
      withdrawals: item.withdrawals,
      dividends: item.dividends,
      cumulativeContributions: item.cumulativeContributions,
      cumulativeDividends: item.cumulativeDividends,
    }));
  }, [monthlyEvolution]);

  // Agrupar posições
  const groupedPositions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todos': positions };
    }

    const groups: Record<string, Position[]> = {};
    positions.forEach((position) => {
      const key = groupBy === 'assetClass'
        ? position.assetClass
        : groupBy === 'broker'
          ? position.broker || 'Sem corretora'
          : position.currency;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(position);
    });

    return groups;
  }, [positions, groupBy]);

  // Insights automáticos (comparação com benchmarks)
  const insights = useMemo(() => {
    const insightsList: string[] = [];
    
    if (monthlyEvolution.length > 0) {
      const avgReturn = monthlyEvolution.reduce((sum, m) => sum + m.returns, 0) / monthlyEvolution.length;
      
      // Comparar com CDI (assumindo ~12% ao ano = ~1% ao mês)
      const cdiMonthly = 1.0;
      if (avgReturn > cdiMonthly * 1.5) {
        insightsList.push(`Sua carteira está performando ${((avgReturn / cdiMonthly - 1) * 100).toFixed(0)}% acima do CDI`);
      } else if (avgReturn < cdiMonthly * 0.5) {
        insightsList.push(`Sua carteira está performando ${((1 - avgReturn / cdiMonthly) * 100).toFixed(0)}% abaixo do CDI`);
      }

      // Comparar com Ibovespa (assumindo ~10% ao ano = ~0.83% ao mês)
      const ibovMonthly = 0.83;
      if (avgReturn > ibovMonthly * 1.2) {
        insightsList.push(`Sua carteira está superando o Ibovespa em ${((avgReturn / ibovMonthly - 1) * 100).toFixed(0)}%`);
      }
    }

    if (totalProfitPercentage > 20) {
      insightsList.push('Excelente rentabilidade! Sua carteira está com ganhos significativos');
    } else if (totalProfitPercentage < -10) {
      insightsList.push('Atenção: Sua carteira está com prejuízo. Considere revisar sua estratégia');
    }

    return insightsList;
  }, [monthlyEvolution, totalProfitPercentage]);

  const handleOperationSuccess = () => {
    void loadData();
    setIsAddOperationModalOpen(false);
    setEditingOperationId(null);
  };

  if (isLoading) {
    return null;
  }

  return (
    <InvestmentsWrapper $theme={theme}>
      <Header />
      <InvestmentsMain>
        <InvestmentsContent>
          <PageHeader>
            <PageTitle>Investimentos</PageTitle>
            <ActionButton
              type="button"
              onClick={() => {
                setEditingOperationId(null);
                setIsAddOperationModalOpen(true);
              }}
            >
              <Plus size={20} />
              Nova Operação
            </ActionButton>
          </PageHeader>

          {/* Resumo da Carteira */}
          <Section>
            <SectionTitle>Resumo da Carteira</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <PositionCard>
                <PositionHeader>Patrimônio Total</PositionHeader>
                <PositionValue>{formatCurrency(totalPortfolioValue)}</PositionValue>
              </PositionCard>
              <PositionCard>
                <PositionHeader>Total Investido</PositionHeader>
                <PositionValue>{formatCurrency(totalInvested)}</PositionValue>
              </PositionCard>
              <PositionCard>
                <PositionHeader>Lucro/Prejuízo</PositionHeader>
                <PositionValue $isPositive={totalProfit >= 0}>
                  {formatCurrency(totalProfit)}
                </PositionValue>
                <PositionChange $isPositive={totalProfitPercentage >= 0}>
                  {formatPercentage(totalProfitPercentage)}
                </PositionChange>
              </PositionCard>
            </div>
          </Section>

          {/* Evolução da Carteira */}
          <Section>
            <SectionTitle>Evolução da Carteira</SectionTitle>
            <SectionDescription>
              Acompanhe a evolução do seu patrimônio ao longo do tempo
            </SectionDescription>
            <ToggleButtonGroup>
              <ToggleButton
                type="button"
                $active={viewMode === 'value'}
                onClick={() => setViewMode('value')}
              >
                Valor (R$)
              </ToggleButton>
              <ToggleButton
                type="button"
                $active={viewMode === 'percentage'}
                onClick={() => setViewMode('percentage')}
              >
                Rentabilidade (%)
              </ToggleButton>
            </ToggleButtonGroup>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height={400}>
                    {viewMode === 'value' ? (
                      <AreaChart data={chartData}>
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
                          dataKey="portfolioValue"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          name="Patrimônio"
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeContributions"
                          stroke="#4ade80"
                          fill="#4ade80"
                          name="Aportes Acumulados"
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeDividends"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          name="Proventos Acumulados"
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number | undefined) =>
                            value !== undefined ? `${value.toFixed(2)}%` : ''
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="portfolioPercentage"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Rentabilidade (%)"
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            )}
          </Section>

          {/* Insights Automáticos */}
          {insights.length > 0 && (
            <Section>
              <SectionTitle>Insights Automáticos</SectionTitle>
              <Card>
                {insights.map((insight, index) => (
                  <InsightCard key={index}>
                    <InsightText>{insight}</InsightText>
                  </InsightCard>
                ))}
              </Card>
            </Section>
          )}

          {/* Tabela de Evolução Mensal */}
          <Section>
            <SectionTitle>Evolução Mensal</SectionTitle>
            <SectionDescription>
              Detalhamento mês a mês da sua carteira
            </SectionDescription>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : monthlyEvolution.length === 0 ? (
              <Card>
                <EmptyStateText>
                  Nenhuma operação registrada ainda. Adicione sua primeira operação para começar a acompanhar sua carteira.
                </EmptyStateText>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Mês</TableHeaderCell>
                      <TableHeaderCell>Patrimônio</TableHeaderCell>
                      <TableHeaderCell>Aportes</TableHeaderCell>
                      <TableHeaderCell>Vendas</TableHeaderCell>
                      <TableHeaderCell>Proventos</TableHeaderCell>
                      <TableHeaderCell>Rentabilidade</TableHeaderCell>
                      <TableHeaderCell></TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <tbody>
                    {monthlyEvolution.map((item) => (
                      <TableRow key={item.month}>
                        <TableCell>{formatMonthYear(item.month)}</TableCell>
                        <TableCell>{formatCurrency(item.portfolioValue)}</TableCell>
                        <TableCell>{formatCurrency(item.contributions)}</TableCell>
                        <TableCell>{formatCurrency(item.withdrawals)}</TableCell>
                        <TableCell>{formatCurrency(item.dividends)}</TableCell>
                        <TableCell
                          style={{
                            color: item.returns >= 0 ? '#4ade80' : '#ef4444',
                          }}
                        >
                          {formatPercentage(item.returns)}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => {
                              // TODO: Implementar modal de detalhes do mês
                              console.log('Ver detalhes do mês:', item.month);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            Ver detalhes
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </Section>

          {/* Tabela de Posições */}
          <Section>
            <SectionTitle>Posições Atuais</SectionTitle>
            <SectionDescription>
              Suas posições calculadas a partir das operações
            </SectionDescription>
            <GroupSelector>
              <GroupButton
                type="button"
                $active={groupBy === 'none'}
                onClick={() => setGroupBy('none')}
              >
                Todos
              </GroupButton>
              <GroupButton
                type="button"
                $active={groupBy === 'assetClass'}
                onClick={() => setGroupBy('assetClass')}
              >
                Por Classe
              </GroupButton>
              <GroupButton
                type="button"
                $active={groupBy === 'broker'}
                onClick={() => setGroupBy('broker')}
              >
                Por Corretora
              </GroupButton>
              <GroupButton
                type="button"
                $active={groupBy === 'currency'}
                onClick={() => setGroupBy('currency')}
              >
                Por Moeda
              </GroupButton>
            </GroupSelector>
            {isLoadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : positions.length === 0 ? (
              <Card>
                <EmptyStateText>
                  Nenhuma posição encontrada. Adicione operações de compra para começar a construir sua carteira.
                </EmptyStateText>
              </Card>
            ) : (
              Object.entries(groupedPositions).map(([groupName, groupPositions]) => (
                <Card key={groupName}>
                  {groupBy !== 'none' && (
                    <SectionTitle style={{ marginBottom: '1rem' }}>{groupName}</SectionTitle>
                  )}
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Ativo</TableHeaderCell>
                        <TableHeaderCell>Classe</TableHeaderCell>
                        <TableHeaderCell>Quantidade</TableHeaderCell>
                        <TableHeaderCell>Preço Médio</TableHeaderCell>
                        <TableHeaderCell>Valor Atual</TableHeaderCell>
                        <TableHeaderCell>% Carteira</TableHeaderCell>
                        <TableHeaderCell>Lucro/Prejuízo</TableHeaderCell>
                        <TableHeaderCell>Tempo Médio</TableHeaderCell>
                        <TableHeaderCell></TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <tbody>
                      {groupPositions.map((position) => (
                        <TableRow key={position.asset}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => {
                                // TODO: Implementar modal de histórico do ativo
                                console.log('Ver histórico do ativo:', position.asset);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {position.asset}
                            </button>
                          </TableCell>
                          <TableCell>{position.assetClass}</TableCell>
                          <TableCell>{position.quantity.toFixed(4)}</TableCell>
                          <TableCell>{formatCurrency(position.averagePrice * 100)}</TableCell>
                          <TableCell>{formatCurrency(position.currentValue)}</TableCell>
                          <TableCell>{position.portfolioPercentage.toFixed(2)}%</TableCell>
                          <TableCell
                            style={{
                              color: position.profit >= 0 ? '#4ade80' : '#ef4444',
                            }}
                          >
                            {formatCurrency(position.profit)} ({formatPercentage(position.profitPercentage)})
                          </TableCell>
                          <TableCell>{Math.round(position.averageHoldingTime / 30)} meses</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => {
                                // TODO: Implementar modal de histórico do ativo
                                console.log('Ver histórico do ativo:', position.asset);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                              }}
                            >
                              Ver histórico
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              ))
            )}
          </Section>
        </InvestmentsContent>
      </InvestmentsMain>

      <AddInvestmentOperationModal
        open={isAddOperationModalOpen}
        onOpenChange={(open) => {
          setIsAddOperationModalOpen(open);
          if (!open) {
            setEditingOperationId(null);
          }
        }}
        onSuccess={handleOperationSuccess}
        operationId={editingOperationId}
      />
    </InvestmentsWrapper>
  );
}
