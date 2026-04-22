// SPDX-License-Identifier: AGPL-3.0-or-later
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({ out: 'build' }),
  },
};

export default config;
