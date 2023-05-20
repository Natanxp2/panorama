'use strict';

const CDTWIDTH = 300;
const DELAYLINEWIDTH = 2 / 2;
let startTime;
let endTime;
let ANIMFLAG = false;

class ConcDelayTimer {
	static CDT = $('#concdelaytimer');
	static centerLine = $('#centerLine');
	static delayLine = $('#delayLine');
	static accel = 800 / 2; // Gravity

	static onLoad() {
		this.CDT.style.opacity = GameModeAPI.GetCurrentGameMode() !== GameMode.CONC ? 0 : 1;
	}

	static onExplosiveHitSpeedUpdate(hitVelocity) {
		let delayTime = hitVelocity.z / this.accel - 3.8;
		delayTime *= 2;
		startTime = MomentumMovementAPI.GetCurrentTime();
		endTime = startTime + delayTime;
		ANIMFLAG = true;
	}

	static onUpdate() {
		if (!ANIMFLAG) return;
		const curTime = MomentumMovementAPI.GetCurrentTime();
		const progress = (curTime - startTime) / (endTime - startTime);
		const delayLinePosition = progress * CDTWIDTH;
		this.delayLine.style.position = delayLinePosition - DELAYLINEWIDTH + 'px 0px 0px';

		if (curTime >= endTime) {
			ANIMFLAG = false;
			this.delayLine.style.position = '0px 0px 0px';
		}
	}

	static {
		$.RegisterForUnhandledEvent('OnExplosiveHitSpeedUpdate', this.onExplosiveHitSpeedUpdate.bind(this));
		$.RegisterForUnhandledEvent('LevelInitPostEntity', this.onLoad.bind(this));
		$.RegisterEventHandler('HudProcessInput', $.GetContextPanel(), this.onUpdate.bind(this));
	}
}
