import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { defineComponent, registerAdapter } from '../../src/index';
import { localAdapter, signal } from '../shared/store';

registerAdapter(localAdapter, { replace: true });

type Option = { id: string; label: string; code: string };

const OPTIONS: Option[] = [
  { id: 'us', label: 'United States', code: 'US' },
  { id: 'ca', label: 'Canada', code: 'CA' },
  { id: 'mx', label: 'Mexico', code: 'MX' },
  { id: 'fr', label: 'France', code: 'FR' },
  { id: 'de', label: 'Germany', code: 'DE' },
  { id: 'jp', label: 'Japan', code: 'JP' },
  { id: 'ng', label: 'Nigeria', code: 'NG' },
  { id: 'br', label: 'Brazil', code: 'BR' }
];

defineComponent('combo-box', (ctx) => {
  const query = signal('');
  const options = signal(OPTIONS);
  const filtered = signal<Option[]>(OPTIONS);
  const isOpen = signal(false);
  const selected = signal<Option | null>(null);
  const dropdownStyle = signal({ top: '0px', left: '0px', width: '0px' });

  const hostId = ctx.host.id || `combo-${Math.random().toString(36).slice(2, 8)}`;
  ctx.host.id = hostId;

  let cleanupAuto: (() => void) | null = null;

  const filterOptions = (value: string) => {
    const q = value.trim().toLowerCase();
    filtered.set(options.value.filter((option) => option.label.toLowerCase().includes(q)));
  };

  const updatePosition = async () => {
    const input = ctx.$refs.input as HTMLInputElement | undefined;
    const dropdown = document.querySelector(`[data-dropdown-for="${hostId}"]`) as HTMLElement | null;
    if (!input || !dropdown) return;

    const { x, y } = await computePosition(input, dropdown, {
      placement: 'bottom-start',
      middleware: [offset(6), flip(), shift({ padding: 8 })]
    });

    dropdownStyle.set({
      top: `${y}px`,
      left: `${x}px`,
      width: `${input.offsetWidth}px`
    });
  };

  const open = () => {
    if (isOpen.value) return;
    isOpen.set(true);
    queueMicrotask(async () => {
      await updatePosition();
      const input = ctx.$refs.input as HTMLInputElement | undefined;
      const dropdown = document.querySelector(`[data-dropdown-for="${hostId}"]`) as HTMLElement | null;
      if (!input || !dropdown) return;
      cleanupAuto?.();
      cleanupAuto = autoUpdate(input, dropdown, updatePosition);
    });
  };

  const close = () => {
    isOpen.set(false);
    cleanupAuto?.();
    cleanupAuto = null;
  };

  const toggle = () => {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  };

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';
    query.set(value);
    filterOptions(value);
    open();
  };

  const onBlur = () => {
    setTimeout(close, 120);
  };

  const select = (option: Option) => {
    selected.set(option);
    query.set(option.label);
    filterOptions(option.label);
    close();
  };

  filterOptions(query.value);
  ctx.registerCleanup(() => cleanupAuto?.());

  return {
    query,
    filtered,
    isOpen,
    selected,
    dropdownStyle,
    hostId,
    open,
    toggle,
    onInput,
    onBlur,
    select
  };
});
