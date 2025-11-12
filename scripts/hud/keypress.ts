import { PanelHandler } from 'util/module-helpers';
import { Button } from 'common/buttons';

interface KeyPanel {
	input: Button;
	icon: string;
	position: { x: number; y: number };
	size?: number;
	rotate?: 0 | 90 | -90 | 180;
	alwaysVisible?: boolean;
}

const BASE_SIZE = 32;
const SCALE_FACTOR = 1.5;

const KEYS: KeyPanel[] = [
	{
		input: Button.FORWARD,
		icon: 'chevron-down',
		rotate: 180,
		position: { x: 48, y: 16 },
		size: 32,
		alwaysVisible: true
	},
	{
		input: Button.SPEED,
		icon: 'chevron-down',
		rotate: 180,
		position: { x: 52, y: 0 },
		size: 24
	},
	{
		input: Button.BACK,
		icon: 'chevron-down',
		rotate: 0,
		position: { x: 48, y: 48 },
		alwaysVisible: true
	},
	{
		input: Button.WALK,
		icon: 'chevron-down',
		rotate: 0,
		position: { x: 52, y: 72 },
		size: 24
	},
	{
		input: Button.MOVELEFT,
		icon: 'chevron-down',
		rotate: 90,
		position: { x: 16, y: 32 },
		size: 32,
		alwaysVisible: true
	},
	{
		input: Button.LEFT,
		icon: 'chevron-down',
		rotate: 90,
		position: { x: 0, y: 36 },
		size: 24
	},
	{
		input: Button.MOVERIGHT,
		icon: 'chevron-down',
		rotate: -90,
		position: { x: 80, y: 32 },
		size: 32,
		alwaysVisible: true
	},
	{
		input: Button.RIGHT,
		icon: 'chevron-down',
		rotate: -90,
		position: { x: 104, y: 36 },
		size: 24
	},
	{
		input: Button.JUMP,
		icon: 'jump',
		rotate: 0,
		position: { x: 40, y: 92 },
		size: 24,
		alwaysVisible: true
	},
	{
		input: Button.DUCK,
		icon: 'jump',
		rotate: 180,
		position: { x: 68, y: 92 },
		size: 24,
		alwaysVisible: true
	}
];

@PanelHandler()
class KeyPress {
	// `state` is used to to track whether the pressed state has actually changed.
	// It's maybe premature optimisation, but saves us making multiple calls into C++ every frame,
	// which is probably the most expensive part of this component.
	readonly panels = {
		keypress: $.GetContextPanel()
	};
	readonly keys: Map<Button, { panel: Image; state: boolean }> = new Map();

	constructor() {
		$.RegisterForUnhandledEvent('MapLoaded', () => this.onLoad());
		$.RegisterEventHandler('HudProcessInput', $.GetContextPanel(), () => this.onUpdate());
	}

	onLoad() {
		const bounds = (axis: 'x' | 'y') =>
			(Math.max(...KEYS.map(({ position }) => position[axis])) + BASE_SIZE) * SCALE_FACTOR + 'px';
		this.panels.keypress.style.width = bounds('x');
		this.panels.keypress.style.height = bounds('y');

		for (const key of KEYS) {
			const size = (key.size ?? BASE_SIZE) * SCALE_FACTOR;
			const panel = $.CreatePanel('Image', this.panels.keypress, '', {
				src: `file://{images}/keypress/${key.icon}.svg`,
				style: `
					width: ${size}px;
					height: ${size}px;
					x: ${key.position.x * SCALE_FACTOR}px;
					y: ${key.position.y * SCALE_FACTOR}px;
					transform: rotateZ(${key.rotate}deg);`,
				textureheight: size * 2
			});

			if (key.alwaysVisible) {
				panel.AddClass('always-visible');
			}

			this.keys.set(key.input, { panel, state: false });
		}
	}

	onUpdate() {
		// @ts-expect-error TODO: Add types!
		const buttonFlags = MomentumInputAPI.GetButtons().physicalButtons;
		for (const [input, value] of this.keys.entries()) {
			const newState = (buttonFlags & input) !== 0;
			if (newState !== value.state) {
				value.panel.SetHasClass('pressed', newState);
				value.state = newState;
			}
		}
	}
}
