import { PanelHandler } from 'util/module-helpers';

import { CustomizerPropertyType, registerHUDCustomizerComponent } from 'common/hud-customizer';
import { splitRgbFromAlpha } from 'util/colors';
import { Gamemode } from 'common/web/enums/gamemode.enum';

@PanelHandler()
class MomHudYawspeed {
	readonly panels = {
		yawspeedLabel: $<Label>('#YawspeedLabel')
	};

	showLabel = true;

	constructor() {
		$.RegisterEventHandler('HudProcessInput', $.GetContextPanel(), this.onUpdate.bind(this));
		registerHUDCustomizerComponent($.GetContextPanel(), {
			resizeX: false,
			resizeY: false,
			gamemode: [Gamemode.SURF, Gamemode.BHOP],
			dynamicStyles: {
				showLabel: {
					name: 'Show Label',
					type: CustomizerPropertyType.CHECKBOX,
					callbackFunc: (_, value) => {
						this.showLabel = value;
					}
				},
				font: {
					name: 'Font',
					type: CustomizerPropertyType.FONT_PICKER,
					targetPanel: '.yawspeed__label',
					styleProperty: 'fontFamily'
				},
				fontSize: {
					name: 'Font Size',
					type: CustomizerPropertyType.NUMBER_ENTRY,
					targetPanel: '.yawspeed__label',
					styleProperty: 'fontSize',
					valueFn: (value) => `${value}px`
				},
				fontColor: {
					name: 'Font Color',
					type: CustomizerPropertyType.COLOR_PICKER,
					targetPanel: '.yawspeed__label',
					styleProperty: 'color',
					callbackFunc: (panel, value) => {
						panel.style.textShadowFast = this.getAdjustedTextShadow(value as rgbaColor);
					}
				}
			}
		});
	}

	onUpdate() {
		const yawspeed = GameInterfaceAPI.GetSettingFloat('cl_yawspeed');
		this.panels.yawspeedLabel.text = this.showLabel ? `Yawspeed: ${yawspeed}` : yawspeed;
	}

	getAdjustedTextShadow(color: rgbaColor) {
		const splitRGBA = splitRgbFromAlpha(color);
		return `0px 1px rgba(0, 0, 0, ${splitRGBA.alpha * 0.9})`;
	}
}
