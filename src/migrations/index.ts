import * as migration_20261118_175854_initial from './20261118_175854_initial';
import * as migration_20261123_210038_announcement_icons from './20261123_210038_announcement_icons';

export const migrations = [
  {
    up: migration_20261118_175854_initial.up,
    down: migration_20261118_175854_initial.down,
    name: '20261118_175854_initial',
  },
  {
    up: migration_20261123_210038_announcement_icons.up,
    down: migration_20261123_210038_announcement_icons.down,
    name: '20261123_210038_announcement_icons'
  },
];
