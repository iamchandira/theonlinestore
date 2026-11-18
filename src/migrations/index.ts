import * as migration_20261118_175854_initial from './20261118_175854_initial';

export const migrations = [
  {
    up: migration_20261118_175854_initial.up,
    down: migration_20261118_175854_initial.down,
    name: '20261118_175854_initial'
  },
];
