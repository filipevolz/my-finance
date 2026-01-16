import styled from 'styled-components';

export const AnalyticsWrapper = styled.div<{ $theme: 'light' | 'dark' }>`
  min-height: 100vh;
  background-color: ${(props) =>
    props.$theme === 'light' ? '#f9fafb' : '#111827'};
  display: flex;
  flex-direction: column;
`;

export const AnalyticsMain = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
`;

export const AnalyticsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin: 0;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin: 0;
`;

export const SectionDescription = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};
  margin: 0;
`;

export const PeriodSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const PeriodButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 0.0625rem solid
    ${(props) => (props.$active ? props.theme.primary : props.theme.border)};
  background-color: ${(props) =>
    props.$active ? props.theme.primary : props.theme.surface};
  color: ${(props) => (props.$active ? '#fff' : props.theme.textSecondary)};
  font-size: 0.875rem;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.$active ? props.theme.primaryHover : props.theme.surfaceSecondary};
    border-color: ${(props) =>
      props.$active ? props.theme.primaryHover : props.theme.border};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }
`;

export const Card = styled.div`
  background-color: ${(props) => props.theme.surface};
  border: 0.0625rem solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 0.0625rem 0.1875rem ${(props) => props.theme.shadow};
`;

export const ChartContainer = styled.div`
  width: 100%;
  margin-bottom: 1rem;
`;

export const InsightCard = styled.article`
  background-color: ${(props) => props.theme.surfaceSecondary};
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
`;

export const InsightText = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.text};
  margin: 0;
  line-height: 1.5;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHeader = styled.thead`
  background-color: ${(props) => props.theme.surfaceSecondary};
`;

export const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  border-bottom: 0.0625rem solid ${(props) => props.theme.border};
`;

export const TableRow = styled.tr`
  border-bottom: 0.0625rem solid ${(props) => props.theme.border};

  &:hover {
    background-color: ${(props) => props.theme.surfaceSecondary};
  }
`;

export const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.875rem;
  color: ${(props) => props.theme.text};
`;

export const HealthScoreCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

export const ScoreValue = styled.strong<{ $color: string }>`
  font-size: 4rem;
  font-weight: 700;
  color: ${(props) => props.$color};
  line-height: 1;
  display: block;
`;

export const ScoreLabel = styled.p`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin: 0;
`;

export const ScoreDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  margin-top: 1rem;
`;

export const ScoreDetailItem = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};
  padding: 0.5rem;
  background-color: ${(props) => props.theme.surfaceSecondary};
  border-radius: 0.5rem;
  margin: 0;
`;

export const InsightsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

export const InsightItem = styled.li`
  font-size: 0.875rem;
  color: ${(props) => props.theme.text};
  padding: 0.75rem;
  background-color: ${(props) => props.theme.surfaceSecondary};
  border-radius: 0.5rem;
  border-left: 0.25rem solid ${(props) => props.theme.primary};
`;

export const HeatmapContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: space-around;
  flex-wrap: wrap;
`;

export const HeatmapLabel = styled.span`
  font-size: 0.75rem;
  color: ${(props) => props.theme.textSecondary};
  margin-bottom: 0.5rem;
  font-weight: 600;
  display: block;
`;

export const HeatmapDay = styled.span<{ $intensity: number }>`
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: ${(props) => {
    const opacity = Math.max(0.2, props.$intensity);
    return `rgba(59, 130, 246, ${opacity})`;
  }};
  color: ${(props) => props.theme.text};
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 4rem;
  text-align: center;
  border: 0.0625rem solid ${(props) => props.theme.border};
  display: block;
`;

export const RecurringExpenseItem = styled.div`
  padding: 1rem;
  border-bottom: 0.0625rem solid ${(props) => props.theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const RecurringExpenseName = styled.strong`
  font-size: 1rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin-bottom: 0.5rem;
  display: block;
`;

export const RecurringExpenseDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};

  strong {
    color: ${(props) => props.theme.text};
  }
`;

export const SourceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 0.0625rem solid ${(props) => props.theme.border};
`;

export const SourceBar = styled.div<{ $width: number }>`
  height: 1.5rem;
  background-color: ${(props) => props.theme.primary};
  border-radius: 0.25rem;
  width: ${(props) => props.$width}%;
  min-width: 2rem;
`;

export const SourceInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

export const ComparisonCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

export const ComparisonCard = styled(Card)`
  display: flex;
  flex-direction: column;
`;

export const ComparisonLabel = styled.p`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};
  margin: 0 0 0.5rem 0;
`;

export const ComparisonValue = styled.strong`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin-bottom: 0.25rem;
  display: block;
`;

export const ComparisonChange = styled.span<{ $isPositive?: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.$isPositive ? '#4ade80' : '#ef4444')};
  font-weight: 500;
  display: block;
`;

export const VillainsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const CategoryCellContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const TableCellWithColor = styled(TableCell)<{ $isPositive?: boolean; $isNegative?: boolean }>`
  color: ${(props) => {
    if (props.$isPositive) return '#4ade80';
    if (props.$isNegative) return '#ef4444';
    return 'inherit';
  }};
`;

export const InsightCardWithMargin = styled(InsightCard)`
  margin-top: 1.5rem;
`;

export const WarningText = styled.span`
  color: #f59e0b;
`;

export const HeatmapSection = styled.div`
  margin-bottom: 2rem;
`;

export const HeatmapSectionTitle = styled.h3`
  margin-bottom: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

export const HeatmapDayContainer = styled.div`
  text-align: center;
`;
