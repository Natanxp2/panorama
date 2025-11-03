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
		$.Msg(this.last_jump_z);
	}

	onLoad() {
		this.gravity = GameInterfaceAPI.GetSettingFloat('sv_gravity');
		this.initializeTrackHeights();
	}

	onUpdate() {
		const velocity = MomentumPlayerAPI.GetVelocity();
		const absVelocitySqr = velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;
		const energy = (absVelocitySqr / 2 + this.gravity * this.last_jump_z) / this.gravity;
		this.panels.energy.text = ((energy / this.last_jump_z) * 100).toFixed(2);
	}
}
