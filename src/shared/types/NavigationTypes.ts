export type NavItem = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  module: string;
  permission?: string;
  order: number;
  badge?: string;
  disabled?: boolean;
  children?: NavItem[];
  backgroundColor?: string;
};
