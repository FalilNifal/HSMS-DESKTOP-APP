import { useEffect } from 'react'
import { AppShell, Burger, Group, NavLink, ScrollArea, Text, Menu, Avatar, UnstyledButton, Badge, ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconLayoutDashboard,
  IconPackages,
  IconClipboardCheck,
  IconArrowsExchange,
  IconShoppingCart,
  IconReceipt2,
  IconFileInvoice,
  IconTruck,
  IconWallet,
  IconUsersGroup,
  IconReportAnalytics,
  IconReceiptTax,
  IconCashRegister,
  IconReceiptRefund,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconUsers,
  IconDatabase,
  IconHistory,
  IconKey,
  IconSun,
  IconMoon
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useCurrentUser, type UserRole } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { getShopSettings } from '../api/settings'
import { deriveAccentFromLogo } from '../lib/logoTheme'
import { logoutActivity } from '../api/activity'
import ChangePasswordModal from './ChangePasswordModal'
import BrandMark from './BrandMark'

interface NavItem {
  label: string
  path: string
  icon: typeof IconLayoutDashboard
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: IconLayoutDashboard, roles: ['Admin', 'Manager', 'Cashier'] },
  { label: 'POS Billing', path: '/pos', icon: IconShoppingCart, roles: ['Admin', 'Manager', 'Cashier'] },
  { label: 'Sales', path: '/sales', icon: IconReceipt2, roles: ['Admin', 'Manager', 'Cashier'] },
  { label: 'Quotations', path: '/quotations', icon: IconFileInvoice, roles: ['Admin', 'Manager', 'Cashier'] },
  { label: 'Products', path: '/products', icon: IconPackages, roles: ['Admin', 'Manager'] },
  { label: 'Stock-take', path: '/stock-take', icon: IconClipboardCheck, roles: ['Admin', 'Manager'] },
  { label: 'Stock History', path: '/stock-history', icon: IconArrowsExchange, roles: ['Admin', 'Manager'] },
  { label: 'Suppliers', path: '/suppliers', icon: IconTruck, roles: ['Admin', 'Manager'] },
  { label: 'Payables', path: '/payables', icon: IconWallet, roles: ['Admin', 'Manager'] },
  { label: 'Customers', path: '/customers', icon: IconUsersGroup, roles: ['Admin', 'Manager'] },
  { label: 'Reports', path: '/reports', icon: IconReportAnalytics, roles: ['Admin', 'Manager'] },
  { label: 'Expenses', path: '/expenses', icon: IconReceiptTax, roles: ['Admin', 'Manager'] },
  { label: 'Day-end', path: '/day-end', icon: IconCashRegister, roles: ['Admin', 'Manager'] },
  { label: 'Returns', path: '/returns', icon: IconReceiptRefund, roles: ['Admin', 'Manager'] },
  { label: 'Users', path: '/users', icon: IconUsers, roles: ['Admin'] },
  { label: 'Activity', path: '/activity', icon: IconHistory, roles: ['Admin'] },
  { label: 'Backup', path: '/backup', icon: IconDatabase, roles: ['Admin'] },
  { label: 'Settings', path: '/settings', icon: IconSettings, roles: ['Admin'] }
]

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'grape',
  Manager: 'blue',
  Cashier: 'teal'
}

export default function AppShellLayout(): JSX.Element {
  const [opened, { toggle }] = useDisclosure()
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)

  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true })
  const toggleColorScheme = (): void =>
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')

  const setShopMeta = useSettingsStore((s) => s.setShopMeta)
  const setAccentColor = useSettingsStore((s) => s.setAccentColor)
  const shopName = useSettingsStore((s) => s.shopName)
  const shopLogo = useSettingsStore((s) => s.logo)
  const shopQuery = useQuery({ queryKey: ['shop-settings'], queryFn: getShopSettings })

  useEffect(() => {
    if (shopQuery.data) {
      setShopMeta({
        currency: shopQuery.data.currency,
        shopName: shopQuery.data.shopName,
        taxRatePercent: shopQuery.data.taxRatePercent,
        taxLabel: shopQuery.data.taxLabel,
        logo: shopQuery.data.logo
      })
      // Adopt the shop's brand color from its logo (accent only).
      if (shopQuery.data.logo) {
        void deriveAccentFromLogo(shopQuery.data.logo).then(setAccentColor)
      } else {
        setAccentColor(null)
      }
    }
  }, [shopQuery.data, setShopMeta, setAccentColor])

  const role = user?.role ?? 'Cashier'
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutActivity()
    } catch {
      // Ignore — still log out locally even if the server call fails.
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <BrandMark size={32} src={shopLogo} />
            <Text fw={700} size="lg">
              {shopName || 'Omni POS'}
            </Text>
          </Group>

          <Group gap="xs">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={toggleColorScheme}
              aria-label="Toggle light and dark mode"
            >
              {computedColorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color={ROLE_COLORS[role]} radius="xl" size={34}>
                    {getInitials(user?.fullName)}
                  </Avatar>
                  <div style={{ lineHeight: 1.1 }}>
                    <Text size="sm" fw={600}>
                      {user?.fullName ?? 'User'}
                    </Text>
                    <Badge size="xs" variant="light" color={ROLE_COLORS[role]}>
                      {role}
                    </Badge>
                  </div>
                  <IconChevronDown size={16} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{user?.username}</Menu.Label>
              <Menu.Item leftSection={<IconKey size={16} />} onClick={openPasswordModal}>
                Change password
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="red"
                onClick={handleLogout}
              >
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            px="sm"
            pt={4}
            pb={8}
            style={{ letterSpacing: '0.05em' }}
          >
            Menu
          </Text>
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                component={RouterNavLink}
                to={item.path}
                label={item.label}
                leftSection={<Icon size={20} stroke={1.6} />}
                active={active}
                variant="light"
                mb={4}
                onClick={() => opened && toggle()}
              />
            )
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <ChangePasswordModal opened={passwordModalOpened} onClose={closePasswordModal} />
    </AppShell>
  )
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
