import { PanelHandler } from 'util/module-helpers';
import { Gamemode } from 'common/web_dontmodifyme';
import { RegisterHUDPanelForGamemode } from '../util/register-for-gamemodes';

@PanelHandler()
class EnergySpeedo {
	readonly panels = {
		energy: $<Label>('#energySpeedoPanel')
	};

	gravity: number;
	trackZ: object;
	last_jump_z: number;
	jump_start_z?: number;
	current_z?: number;
	initial_energy?: number;
	end_height?: number;
	// integration state
	prev_vz?: number;
	lastUpdateTime?: number;
	tickAccumulator = 0;
	useTrapezoid = true;

	constructor() {
		RegisterHUDPanelForGamemode({
			onLoad: () => this.onLoad(),
			gamemodes: [Gamemode.SURF],
			handledEvents: [
				{
					event: 'HudProcessInput',
					panel: $.GetContextPanel(),
					callback: () => this.onUpdate()
				}
			]
		});

		$.RegisterForUnhandledEvent('OnJumpStarted', () => this.GetPlayerZ());
	}

	private initializeTrackHeights() {
		const zoneDefs = MomentumTimerAPI.GetActiveZoneDefs();
		this.trackZ = {};

		// Main track (type 0) - get start zone (first checkpoint of first segment)
		const mainZones = zoneDefs.tracks.main.zones;
		this.trackZ['0_1'] = mainZones.segments[0].checkpoints[0].regions[0].bottom + 64;

		// Stages (type 1) - each segment is a stage
		mainZones.segments.forEach((segment: any, index: number) => {
			this.trackZ[`1_${index + 1}`] = segment.checkpoints[0].regions[0].bottom + 64;
		});

		// Bonuses (type 2) - get start zone (first checkpoint of first segment)
		if (zoneDefs.tracks.bonuses) {
			zoneDefs.tracks.bonuses.forEach((bonusTrack: any, index: number) => {
				this.trackZ[`2_${index + 1}`] = bonusTrack.zones.segments[0].checkpoints[0].regions[0].bottom + 64;
			});
		}
	}

	GetPlayerZ() {
		const track = MomentumTimerAPI.GetObservedTimerStatus().trackId;
		this.last_jump_z = this.trackZ[`${track.type}_${track.number}`];
		// Initialize jump state using zone data
		this.jump_start_z = this.last_jump_z;
		this.current_z = this.jump_start_z;

		// Determine end height for the current track so potential energy is relative to it
		const zoneDefs = MomentumTimerAPI.GetActiveZoneDefs();
		if (track.type === 2) {
			// bonus
			const bonus = zoneDefs.tracks.bonuses?.[track.number - 1];
			this.end_height = bonus?.zones?.end?.regions?.[0]?.bottom ?? 0;
		} else {
			// main or stage - use main track end
			this.end_height = zoneDefs.tracks.main.zones.end.regions[0].bottom;
		}

		// capture starting kinetic energy and compute baseline initial energy using the same formula
		// that onUpdate() will use, to avoid mismatch between baseline and live calculation.
		const v = MomentumPlayerAPI.GetVelocity();
		const vSqr = v.x ** 2 + v.y ** 2 + v.z ** 2;
		const startEnergy =
			(vSqr / 2.0 + this.gravity * Math.abs((this.current_z ?? this.jump_start_z) - (this.end_height ?? 0))) /
			this.gravity;
		this.initial_energy = startEnergy || 0.000001;

		// store previous vertical velocity for trapezoid integration
		this.prev_vz = v.z;
	}

	onLoad() {
		this.gravity = GameInterfaceAPI.GetSettingFloat('sv_gravity');
		this.initializeTrackHeights();
		// initialize time for physics-aligned integration
		this.lastUpdateTime = MomentumMovementAPI.GetCurrentTime();
	}

	onUpdate() {
		const velocity = MomentumPlayerAPI.GetVelocity();
		const velSqr = velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;

		// If we don't have a jump baseline, don't compute percentage
		if (this.initial_energy === undefined || this.jump_start_z === undefined) {
			this.panels.energy.text = '-';
			return;
		}

		// Physics-aligned integration: accumulate frame time and step in fixed tick intervals
		const moveHud = MomentumMovementAPI.GetMoveHudData();
		$.Msg(moveHud.moveStatus);
		const inAir = moveHud?.moveStatus === MomentumMovementAPI.PlayerMoveStatus.AIR;
		const tick = MomentumMovementAPI.GetTickInterval();
		const now = MomentumMovementAPI.GetCurrentTime();
		const frameDt = this.lastUpdateTime !== undefined ? now - this.lastUpdateTime : 0;
		this.lastUpdateTime = now;
		this.tickAccumulator += frameDt;
		const curr_vz = velocity.z;
		while (this.tickAccumulator >= tick) {
			const avg_vz = this.useTrapezoid && this.prev_vz !== undefined ? (this.prev_vz + curr_vz) / 2 : curr_vz;
			if (inAir && this.current_z !== undefined) {
				this.current_z += avg_vz * tick;
				// update prev_vz only while in-air so we don't carry over values between jumps
				this.prev_vz = curr_vz;
			} else {
				// when grounded, clear prev_vz so trapezoid integration starts fresh on next jump
				this.prev_vz = undefined;
			}
			this.tickAccumulator -= tick;
		}
		// debug: last jump start z
		// $.Msg(this.last_jump_z);

		const currentEnergy = (velSqr / 2.0 + this.gravity * (this.current_z - this.last_jump_z)) / this.gravity;
		this.panels.energy.text = currentEnergy.toFixed(2);
	}
}
