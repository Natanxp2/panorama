import { PanelHandler } from 'util/module-helpers';
import { Gamemode } from 'common/web_dontmodifyme';
import { RegisterHUDPanelForGamemode } from '../util/register-for-gamemodes';

@PanelHandler()
class EnergySpeedo {
	readonly panels = {
		energy: $<Label>('#energySpeedoPanel')
	};

	gravity: number;
	tickrate: number;
	starting_z: number;
	end_height: number;
	platform_height_difference: number;
	denominator: number;
	current_z: number;
	currentTrackNumber = 0; // 0 for main track, 1+ for bonuses

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
	}

	private getTrackStartAndEndHeights(trackNumber: number): { startHeight: number; endHeight: number } {
		const zoneDefs = MomentumTimerAPI.GetActiveZoneDefs();
		const zones = trackNumber === 0 ? zoneDefs.tracks.main.zones : zoneDefs.tracks.bonuses[trackNumber - 1].zones;

		// Get start height (first segment's bottom + 64 for player height)
		const startHeight = zones.segments[0].checkpoints[0].regions[0].bottom + 64;

		// Get end height (use first region's bottom if multiple end regions)
		const endHeight = zones.end.regions[0].bottom;

		return { startHeight, endHeight };
	}

	onLoad() {
		// Get the current track's heights (main track by default)
		const { startHeight, endHeight } = this.getTrackStartAndEndHeights(0);

		this.gravity = GameInterfaceAPI.GetSettingFloat('sv_gravity');

		this.starting_z = startHeight;
		this.end_height = endHeight;

		// Initial potential energy at the start is our reference point (100%)
		this.platform_height_difference = this.starting_z - this.end_height;
		const initialPotentialEnergy = this.gravity * this.platform_height_difference;
		this.denominator = initialPotentialEnergy;

		const interval_per_tick = GameInterfaceAPI.GetSettingFloat('sv_interval_per_tick');

		if (interval_per_tick !== 0) {
			this.tickrate = 1 / interval_per_tick;
		} else {
			this.tickrate = (100 / 3) * 2;
		}
	}

	onUpdate() {
		const timerStatus = MomentumTimerAPI.GetObservedTimerStatus();

		// Get current track number (0 for main, bonus number for bonuses)
		const currentTrack = timerStatus.trackId?.type === 2 ? timerStatus.trackId.number : 0;

		// Check if we're on a different track
		if (currentTrack !== this.currentTrackNumber) {
			const { startHeight, endHeight } = this.getTrackStartAndEndHeights(currentTrack);
			this.currentTrackNumber = currentTrack;
			this.starting_z = startHeight;
			this.end_height = endHeight;
			this.platform_height_difference = this.starting_z - this.end_height;
			this.denominator = this.gravity * this.platform_height_difference;
			this.current_z = undefined;
		}

		if (timerStatus.state !== 2) {
			this.current_z = undefined;
			return;
		}

		// Initialize or reset current_z when starting
		if (this.current_z === undefined) {
			this.current_z = this.starting_z;
		}

		const velocity = MomentumPlayerAPI.GetVelocity();
		const velocityPerTick = velocity.z * (1 / this.tickrate);
		this.current_z += velocityPerTick;

		// Calculate current total energy (kinetic + potential)
		const heightFromEnd = this.current_z - this.end_height;
		const absVelocity = Math.hypot(velocity.x, velocity.y, velocity.z);
		const kineticEnergy = 0.5 * absVelocity ** 2;
		const potentialEnergy = this.gravity * heightFromEnd;
		const totalEnergy = kineticEnergy + potentialEnergy;

		// Compare to initial potential energy (100% = perfect conversion, >100% = gained through strafing)
		let energyPercent = (totalEnergy / this.denominator) * 100;

		// Round to 2 decimal places
		energyPercent = Math.floor(energyPercent * 100) / 100;

		this.panels.energy.text = energyPercent + '%';
	}
}
