import { CategoryTooltipContainer, CategoryTooltipValue, CategoryTooltipTitle, CategoryTooltipPercentage } from "./style";

export function CategoryTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const { name, value, percentage } = payload[0].payload;

        return (
            <CategoryTooltipContainer>
                <CategoryTooltipTitle>{name}</CategoryTooltipTitle>
                <CategoryTooltipValue>
                    {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                    }).format(value)}
                </CategoryTooltipValue>
                <CategoryTooltipPercentage>{percentage.toFixed(2)}%</CategoryTooltipPercentage>
            </CategoryTooltipContainer>
        );
    }

    return null;
}
