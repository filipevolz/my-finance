import styled from 'styled-components';

export const InvestmentsWrapper = styled.div<{ $theme: 'light' | 'dark' }>`
  min-height: 100vh;
  background-color: ${(props) =>
    props.$theme === 'light' ? '#f9fafb' : '#111827'};
  display: flex;
  flex-direction: column;
`;

export const InvestmentsMain = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
`;

export const InvestmentsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

export const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin: 0;
`;

export const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: ${(props) => props.theme.primary};
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.primaryHover};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }
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

export const ToggleButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

export const ToggleButton = styled.button<{ $active?: boolean }>`
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

export const PositionCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const PositionHeader = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.textSecondary};
  font-weight: 500;
  margin: 0;
`;

export const PositionValue = styled.strong<{ $isPositive?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
  color: ${(props) =>
    props.$isPositive !== undefined
      ? props.$isPositive
        ? '#4ade80'
        : '#ef4444'
      : props.theme.text};
`;

export const PositionChange = styled.span<{ $isPositive?: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.$isPositive ? '#4ade80' : '#ef4444')};
  font-weight: 500;
  display: block;
`;

export const EmptyStateText = styled.p`
  text-align: center;
  color: ${(props) => props.theme.textSecondary};
  font-size: 0.875rem;
  padding: 2rem;
`;

export const InsightCard = styled.article`
  background-color: ${(props) => props.theme.surfaceSecondary};
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const InsightText = styled.p`
  font-size: 0.875rem;
  color: ${(props) => props.theme.text};
  margin: 0;
  line-height: 1.5;
`;

export const GroupSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

export const GroupButton = styled.button<{ $active?: boolean }>`
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

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
  gap: 1rem;
`;

export const TableCellWithColor = styled(TableCell)<{ $isPositive?: boolean }>`
  color: ${(props) => (props.$isPositive ? '#4ade80' : '#ef4444')};
`;

export const LinkButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.primary};
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
    border-radius: 0.25rem;
  }
`;

export const AssetLinkButton = styled(LinkButton)`
  font-weight: 600;
`;

export const GroupSectionTitle = styled(SectionTitle)`
  margin-bottom: 1rem;
`;
