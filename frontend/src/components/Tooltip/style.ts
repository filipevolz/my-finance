import styled from "styled-components";

export const CategoryTooltipContainer = styled.div`
    background: ${props => props.theme.background};
    border: 1px solid ${props => props.theme.border};
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: ${props => props.theme.text};
    font-size: 0.875rem;
`;

export const CategoryTooltipTitle = styled.h3`
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
`;

export const CategoryTooltipValue = styled.p`
    font-size: 0.875rem;
    font-weight: 500;
    color: ${props => props.theme.text};
`;

export const CategoryTooltipPercentage = styled(CategoryTooltipValue)`
    color: ${props => props.theme.textSecondary};
`;