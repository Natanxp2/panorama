'use strict';

class SjPitchTrainer {
	static SPT = $('#sjpitchtrainer');

	static screenY = $.GetContextPanel().actuallayoutheight;
	static screenX = $.GetContextPanel().actuallayoutwidth;
	static scale = $.GetContextPanel().actualuiscale_y;
	static fov4_3 = GameInterfaceAPI.GetSettingFloat('fov_desired'); //source uses 4:3 for fov setting
	static vFov_tangent = 0.75 * Math.tan((0.5 * this.fov4_3 * Math.PI) / 180);
	static vFov = Math.atan(this.vFov_tangent);

	static centerPitch = -78;
	static width = 10;
	static height = 10;

	static mapToScreenHeight(angle) {
		const screenHeight = this.screenY / this.scale;

		if (Math.abs(angle) >= this.vFov) {
			// This is supposed to prevent the element from appearing at the bottom of the screen;
			// For some unknown to me reason, if the element is set to be outside of the screen at all it's bugged;
			// Going to Menu while the element is not visible on screen makes it not appear anymore, even though the position is calculated properly;
			// Since I have no idea how to fix this I am making 1 pixel of it always on the visible on the screen;
			return -(this.height / 2 - 1);
		}
		return ((1 - Math.tan(angle) / Math.tan(this.vFov)) * screenHeight * 0.5).toFixed(0);
	}

	static onLoad() {
		if (GameModeAPI.GetCurrentGameMode() !== GameMode.SJ) return;
		this.SPT.style.width = this.width + 'px';
		this.SPT.style.height = this.height + 'px';
		this.SPT.style.backgroundColor = '#1896d3';
		this.SPT.style.border = '1px solid black';
		this.SPT.style.transform = 'translateY(' + -this.height / 2 + 'px)';
	}

	static onUpdate() {
		this.screenY = $.GetContextPanel().actuallayoutheight;
		const screenHeight = this.screenY / this.scale;
		const angle = ((MomentumPlayerAPI.GetAngles().x - this.centerPitch) * Math.PI) / 180;
		const yPos = this.mapToScreenHeight(angle);
		this.SPT.style.position = '0px ' + yPos + 'px 0px';
	}

	static {
		$.RegisterEventHandler('HudProcessInput', $.GetContextPanel(), this.onUpdate.bind(this));
		$.RegisterForUnhandledEvent('LevelInitPostEntity', this.onLoad.bind(this));
	}
}
