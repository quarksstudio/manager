import { fireEvent, render, screen } from '@testing-library/react';

import { Tabs } from './tabs';
import { TabsContent } from './tabs-content';
import { TabsList } from './tabs-list';
import { TabsTrigger } from './tabs-trigger';

describe('Tabs', () => {
  it('shows the defaultValue tab content', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Option A</TabsTrigger>
          <TabsTrigger value="b">Option B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Content A')).toBeTruthy();
    expect(screen.queryByText('Content B')).toBeNull();
  });

  it('switches content and updates aria state on trigger click', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Option A</TabsTrigger>
          <TabsTrigger value="b">Option B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    const buttonB = screen.getByRole('tab', { name: 'Option B' });
    expect(buttonB.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(buttonB);
    expect(buttonB.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Content B')).toBeTruthy();
    expect(screen.queryByText('Content A')).toBeNull();
  });

  it('reports changes through onValueChange', () => {
    const onValueChange = jest.fn();
    render(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="a">Option A</TabsTrigger>
          <TabsTrigger value="b">Option B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Option B' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('is controlled by the value prop', () => {
    const onValueChange = jest.fn();
    render(
      <Tabs value="b" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="a">Option A</TabsTrigger>
          <TabsTrigger value="b">Option B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Content B')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Option A' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(screen.getByText('Content B')).toBeTruthy();
  });
});
