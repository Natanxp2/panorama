// (0.5 * v^2 + g * Δh)/(g * H0)

'use strict';
const GRAVITY = 800;
const PLATFORM_HEIGHT_DIFFERENCE = 14508; // surf_boreas
const STARTING_Z = 14800; //surf_boreas
const END_HEIGHT = 292;
const DENOMINATOR = GRAVITY * PLATFORM_HEIGHT_DIFFERENCE;

class EnergySpeedo {
	static energySpeedo = $('#EnergySpeedoLabel');
	static currentZ = STARTING_Z;

	static onUpdate() {
		if (MomentumTimerAPI.GetTimerState() === 0) {
			this.currentZ = STARTING_Z;
		}
		this.velocity = MomentumPlayerAPI.GetVelocity();
		this.velocityPerTick = this.velocity.z * (1 / 66);
		this.currentZ += this.velocityPerTick;
		this.delta = this.currentZ - END_HEIGHT;
		this.absVelocity = Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z);
		this.numerator = 0.5 * this.absVelocity ** 2 + GRAVITY * this.delta;
		this.energy = this.numerator / DENOMINATOR;
		this.energy *= 100;
		this.energy = Math.floor(this.energy * 100) / 100;
		this.energySpeedo.text = this.energy + '%';
	}

	static {
		// $.RegisterForUnhandledEvent('LevelInitPostEntity', this.onLoad.bind(this));
		$.RegisterEventHandler('HudProcessInput', $.GetContextPanel(), this.onUpdate.bind(this));
	}
}
