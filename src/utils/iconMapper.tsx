import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

/**
 * Mapeia nome do componente Lucide (ex: "AlarmClock") para componente do Lucide React
 * O nome já deve estar em PascalCase conforme armazenado no banco de dados
 */
export function getLucideIcon(iconName: string | null | undefined): React.ComponentType<LucideProps> | null {
  if (!iconName) {
    return null;
  }

  // O nome já deve estar em PascalCase (ex: "AlarmClock")
  const IconComponent = (LucideIcons as any)[iconName] as React.ComponentType<LucideProps> | undefined;

  return IconComponent || null;
}

/**
 * Componente que renderiza ícone do Lucide baseado no nome do componente armazenado no banco
 * O nome deve estar em PascalCase (ex: "AlarmClock", "DollarSign", etc.)
 */
interface IconRendererProps extends LucideProps {
  iconName: string | null | undefined;
  fallback?: React.ReactNode;
}

export function IconRenderer({ iconName, fallback = null, ...props }: IconRendererProps) {
  const IconComponent = getLucideIcon(iconName);

  if (!IconComponent) {
    return fallback ? <>{fallback}</> : null;
  }

  return <IconComponent {...props} />;
}

