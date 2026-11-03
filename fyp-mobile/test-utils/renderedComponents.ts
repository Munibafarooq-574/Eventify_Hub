import type { RenderResult } from '@testing-library/react-native';

type Container = RenderResult['container'];
type Fiber = NonNullable<Container['unstable_fiber']>;
type ComponentMatch = { host: Container; props: Container['props'] };

// These tests inspect composite props that are absent from the native output.
export function getRenderedComponents(container: Container, component: unknown) {
  const matches = new Map<Fiber, ComponentMatch>();
  for (const host of container.queryAll(() => true)) {
    for (let fiber = host.unstable_fiber; fiber; fiber = fiber.return) {
      if ((fiber.type === component || fiber.elementType === component) && !matches.has(fiber)) {
        matches.set(fiber, { host, props: fiber.memoizedProps });
      }
    }
  }
  return [...matches.values()];
}

export function getRenderedComponent(container: Container, component: unknown) {
  const matches = getRenderedComponents(container, component);
  if (matches.length !== 1) {
    throw new Error(`Expected one rendered component, found ${matches.length}`);
  }
  return matches[0];
}
