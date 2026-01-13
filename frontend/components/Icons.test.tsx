import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  DatabaseIcon,
  ServerIcon,
  ZapIcon,
  BoxIcon,
  FolderIcon,
  CogIcon,
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  SearchIcon,
  HomeIcon,
  SettingsIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XCircleIcon,
  CheckCircleIcon,
} from './Icons';

describe('Icons Component', () => {
  it('should render DatabaseIcon', () => {
    const { container } = render(<DatabaseIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('class');
  });

  it('should render ServerIcon', () => {
    const { container } = render(<ServerIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render ZapIcon', () => {
    const { container } = render(<ZapIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render BoxIcon', () => {
    const { container } = render(<BoxIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render FolderIcon', () => {
    const { container } = render(<FolderIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render CogIcon', () => {
    const { container } = render(<CogIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render UploadIcon', () => {
    const { container } = render(<UploadIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render DownloadIcon', () => {
    const { container } = render(<DownloadIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render TrashIcon', () => {
    const { container } = render(<TrashIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render PlusIcon', () => {
    const { container } = render(<PlusIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render MinusIcon', () => {
    const { container } = render(<MinusIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render SearchIcon', () => {
    const { container } = render(<SearchIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render HomeIcon', () => {
    const { container } = render(<HomeIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render SettingsIcon', () => {
    const { container } = render(<SettingsIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render ChevronRightIcon', () => {
    const { container } = render(<ChevronRightIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render ChevronDownIcon', () => {
    const { container } = render(<ChevronDownIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render XCircleIcon', () => {
    const { container } = render(<XCircleIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render CheckCircleIcon', () => {
    const { container } = render(<CheckCircleIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});