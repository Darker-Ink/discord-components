import {
  Children,
  cloneElement,
  Component,
  createElement,
  isValidElement,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from 'react';

// What a child of a TransitionGroup implements (as a class component, reached through its ref) to
// animate in and out. Each `componentWill*` gets a callback to call once its transition is done.
export interface TransitionGroupChild {
  componentWillAppear?: (done: () => void) => void;
  componentDidAppear?: () => void;
  componentWillEnter?: (done: () => void) => void;
  componentDidEnter?: () => void;
  componentWillLeave?: (done: () => void) => void;
  componentDidLeave?: () => void;
}

type ChildMapping = Record<string, ReactElement>;

const getChildMapping = (children: ReactNode): ChildMapping => {
  const mapping: ChildMapping = {};
  if (children)
    Children.map(children, (child) => child)?.forEach((child) => {
      if (isValidElement(child) && child.key != null) mapping[child.key] = child;
    });
  return mapping;
};

// Merges the previous and next children so that leaving children keep their position.
const mergeChildMappings = (previous: ChildMapping = {}, next: ChildMapping = {}): ChildMapping => {
  const getValue = (key: string) => (Object.hasOwn(next, key) ? next[key] : previous[key]);
  const pendingKeysByNextKey: Record<string, string[]> = {};
  let pendingKeys: string[] = [];
  for (const key in previous) {
    if (Object.hasOwn(next, key)) {
      if (pendingKeys.length > 0) {
        pendingKeysByNextKey[key] = pendingKeys;
        pendingKeys = [];
      }
    } else {
      pendingKeys.push(key);
    }
  }
  const merged: ChildMapping = {};
  for (const key in next) {
    if (Object.hasOwn(pendingKeysByNextKey, key))
      for (const pendingKey of pendingKeysByNextKey[key]) merged[pendingKey] = getValue(pendingKey);
    merged[key] = getValue(key);
  }
  for (const key of pendingKeys) merged[key] = getValue(key);
  return merged;
};

type TransitionMethod = 'componentWillAppear' | 'componentWillEnter' | 'componentWillLeave';
type TransitionDoneMethod = 'componentDidAppear' | 'componentDidEnter' | 'componentDidLeave';

export interface TransitionGroupProps {
  component?: ElementType;
  transitionAppear?: boolean;
  transitionLeave?: boolean;
  transitionEnter?: boolean;
  childFactory?: ((child: ReactElement) => ReactElement) | null;
  children?: ReactNode;
  [prop: string]: unknown;
}

interface TransitionGroupState {
  children: ChildMapping;
  firstRender: boolean;
}

const DEFAULT_PROPS = {
  component: 'span',
  transitionAppear: true,
  transitionLeave: true,
  transitionEnter: true,
  childFactory: null,
} as const;

// The client's own take on the old react-addons-transition-group: keeps removed children mounted
// until their `componentWillLeave` finishes, and calls the enter/appear hooks of new ones.
export class TransitionGroup extends Component<TransitionGroupProps, TransitionGroupState> {
  static defaultProps = DEFAULT_PROPS;

  static getDerivedStateFromProps(props: TransitionGroupProps, state: TransitionGroupState) {
    const next = getChildMapping(props.children);
    return { children: state.firstRender ? next : mergeChildMappings(state.children, next), firstRender: false };
  }

  currentlyTransitioningKeys = new Set<string>();
  keysToEnter: string[] = [];
  keysToLeave: string[] = [];
  isMounted = false;
  keyChildMapping: Record<string, TransitionGroupChild | null> = {};

  constructor(props: TransitionGroupProps) {
    super(props);
    this.state = { children: getChildMapping(props.children), firstRender: true };
  }

  override componentDidMount() {
    this.isMounted = true;
    const { children } = this.state;
    if (this.props.transitionAppear) for (const key in children) if (children[key]) this.performAppear(key);
  }

  override componentWillUnmount() {
    this.isMounted = false;
    this.keyChildMapping = {};
    // Matches the client, which drops the children without a re-render on unmount.
    (this.state as { children: ChildMapping }).children = {};
  }

  override componentDidUpdate(prevProps: TransitionGroupProps, prevState: TransitionGroupState) {
    if (
      prevProps.children !== this.props.children ||
      prevProps.transitionAppear !== this.props.transitionAppear ||
      prevProps.transitionLeave !== this.props.transitionLeave
    ) {
      const next = getChildMapping(this.props.children);
      const previous = prevState.children;
      if (this.props.transitionEnter) this.enqueueTransitions(next, previous, this.keysToEnter);
      else if (this.keysToEnter.length > 0) this.keysToEnter = [];
      if (this.props.transitionLeave) {
        this.enqueueTransitions(previous, next, this.keysToLeave);
      } else {
        const leaving: string[] = [];
        this.enqueueTransitions(previous, next, leaving);
        const merged = mergeChildMappings(previous, next);
        for (const key of leaving) delete merged[key];
        if (this.isMounted) this.setState({ children: merged });
        if (this.keysToLeave.length > 0) this.keysToLeave = [];
      }
    }
    if (this.keysToEnter.length > 0) {
      const keys = this.keysToEnter;
      this.keysToEnter = [];
      keys.forEach(this.performEnter, this);
    }
    if (this.keysToLeave.length > 0) {
      const keys = this.keysToLeave;
      this.keysToLeave = [];
      keys.forEach(this.performLeave, this);
    }
  }

  enqueueTransitions(from: ChildMapping, to: ChildMapping, queue: string[]) {
    for (const key in from) {
      const inTo = to != null && Object.hasOwn(to, key);
      if (from[key] && !inTo && !this.currentlyTransitioningKeys.has(key)) queue.push(key);
    }
  }

  perform(key: string, method: TransitionMethod, doneMethod: TransitionDoneMethod, isLeave = false) {
    this.currentlyTransitioningKeys.add(key);
    const done = () => this.handleDonePerform(key, doneMethod, isLeave);
    const child = this.keyChildMapping[key];
    const transition = child?.[method];
    if (child != null && transition != null) transition(done);
    else done();
  }

  handleDonePerform(key: string, doneMethod: TransitionDoneMethod, isLeave = false) {
    const child = this.keyChildMapping[key];
    child?.[doneMethod]?.();
    this.currentlyTransitioningKeys.delete(key);
    const current = getChildMapping(this.props.children);
    if (isLeave) {
      if (current != null && Object.hasOwn(current, key)) {
        this.performEnter(key);
      } else {
        this.setState(({ children }) => {
          const { [key]: _removed, ...rest } = children;
          return { children: rest };
        });
      }
    } else if (current == null || !Object.hasOwn(current, key)) {
      this.performLeave(key);
    }
  }

  performAppear(key: string) {
    this.perform(key, 'componentWillAppear', 'componentDidAppear');
  }

  performEnter(key: string) {
    this.perform(key, 'componentWillEnter', 'componentDidEnter');
  }

  performLeave(key: string) {
    this.perform(key, 'componentWillLeave', 'componentDidLeave', true);
  }

  addChildRef = (key: string, instance: TransitionGroupChild | null) => {
    this.keyChildMapping[key] = instance;
  };

  override render() {
    const { childFactory, component } = this.props;
    const { children } = this.state;
    const rendered: ReactElement[] = [];
    for (const key in children) {
      const child = children[key];
      if (child != null && isValidElement(child)) {
        rendered.push(
          cloneElement(childFactory == null ? child : childFactory(child), {
            ref: (instance: TransitionGroupChild | null) => this.addChildRef(key, instance),
            key,
          } as Record<string, unknown>),
        );
      }
    }
    const props: Record<string, unknown> = { ...this.props };
    for (const name of Object.keys(DEFAULT_PROPS)) delete props[name];
    delete props.children;
    return createElement(component ?? 'span', props, rendered);
  }
}
