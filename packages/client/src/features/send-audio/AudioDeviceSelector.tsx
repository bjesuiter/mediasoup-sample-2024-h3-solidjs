import {createQuery, QueryClient, useQueryClient} from '@tanstack/solid-query';
import {For, Suspense, createEffect, createSignal} from 'solid-js';

export function AudioDeviceSelector(props: {onDeviceSelected?: (stream?: MediaStream) => any}) {
	const queryClient = useQueryClient();
	const [selectedDeviceId, setSelectedDeviceId] = createSignal<string | undefined>('default');

	const localAudioDevices = createQuery(() => ({
		queryKey: ['localAudioDevices'],
		queryFn: async () => {
			return navigator.mediaDevices.enumerateDevices().then(devices => {
				return devices.filter(device => device.kind === 'audioinput');
			});
		},
	}));

	const selectedAudioStream = createQuery(() => ({
		queryKey: ['selectedAudioStream', selectedDeviceId()],
		queryFn: async () => {
			const constraints = {
				video: false, // No video
				audio: {
					deviceId: selectedDeviceId(),
					sampleRate: 48000, // High sample rate
					echoCancellation: false, // Disable echo cancellation for raw audio
					noiseSuppression: false, // Disable noise suppression for raw audio
					autoGainControl: false, // Disable auto gain control for raw audio
				},
			};

			if (!selectedDeviceId() || selectedDeviceId() === 'default') {
				delete constraints.audio.deviceId;
			}

			const userAudioMedia = await navigator.mediaDevices.getUserMedia(constraints);

			return userAudioMedia;
		},
	}));

	createEffect(() => {
		const selectedStream = selectedAudioStream.data;

		if (props.onDeviceSelected) {
			props.onDeviceSelected(selectedStream);
		}
	});

	// queryClient.prefetchQuery({queryKey: ['selectedAudioStream']});

	return (
		<>
			<label for="audio-device-select">Audio Device Selection</label>
			<Suspense fallback={<p>Loading Audio Devices ...</p>}>
				<select
					id="audio-device-select"
					class="rounded-md border-2 border-slate-700 p-2 shadow-inner"
					value={selectedDeviceId()}
					onChange={e => setSelectedDeviceId(e.target.value)}
				>
					{localAudioDevices.data?.map(device => (
						<option value={device.deviceId}>
							{device.label} ({device.deviceId.substring(0, 8)})
						</option>
					))}
				</select>
			</Suspense>

			<fieldset class="rounded-md border-2 border-slate-700 p-3">
				<legend>Debug</legend>
				<p>Selected Device Id: {selectedDeviceId()}</p>
				<span>Selected Audio Stream Tracks:</span>
				<ul>
					<For
						each={selectedAudioStream.data?.getAudioTracks()}
						fallback={<div>No selected tracks</div>}
					>
						{track => <li class="ml-4 list-disc">{track.label}</li>}
					</For>
				</ul>
			</fieldset>
		</>
	);
}
