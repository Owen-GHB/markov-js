import https from 'https';
import http from 'http';
import fs from 'fs';

export async function getJSON(url, depth = 0) {
	if (depth > 5) throw new Error('Too many redirects');

	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (res.statusCode === 301 || res.statusCode === 302) {
					const location = res.headers.location;
					if (!location) return reject(new Error('Redirect with no location'));
					const base = new URL(url);
					return resolve(getJSON(new URL(location, base).href, depth + 1));
				}

				if (res.statusCode !== 200) {
					res.resume();
					return reject(new Error(`HTTP ${res.statusCode}`));
				}

				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (err) {
						reject(new Error('Invalid JSON response'));
					}
				});
			})
			.on('error', reject);
	});
}

export async function downloadFile(url, filepath) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(filepath);
		const getClient = (url) => (url.startsWith('https:') ? https : http);

		const doGet = (url, depth = 0) => {
			if (depth > 5) {
				return reject(new Error('Too many redirects'));
			}

			const client = getClient(url);
			client
				.get(url, (res) => {
					if (res.statusCode === 301 || res.statusCode === 302) {
						let location = res.headers.location;
						if (!location)
							return reject(new Error('Redirect with no location'));
						if (!/^https?:\/\//i.test(location)) {
							const base = new URL(url);
							location = new URL(location, base).href;
						}
						return doGet(location, depth + 1);
					}

					if (res.statusCode !== 200) {
						return reject(new Error(`HTTP ${res.statusCode}`));
					}

					res.pipe(file);
					file.on('finish', () => {
						file.close();
						resolve();
					});
				})
				.on('error', reject);
		};

		doGet(url);
	});
}
