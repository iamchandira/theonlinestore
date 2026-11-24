import * as migration_20261118_175854_initial from './20261118_175854_initial';
import * as migration_20261123_210038_announcement_icons from './20261123_210038_announcement_icons';
import * as migration_20261124_080116_chat_assistant from './20261124_080116_chat_assistant';

export const migrations = [
  {
    up: migration_20261118_175854_initial.up,
    down: migration_20261118_175854_initial.down,
    name: '20261118_175854_initial',
  },
  {
    up: migration_20261123_210038_announcement_icons.up,
    down: migration_20261123_210038_announcement_icons.down,
    name: '20261123_210038_announcement_icons',
  },
  {
    up: migration_20261124_080116_chat_assistant.up,
    down: migration_20261124_080116_chat_assistant.down,
    name: '20261124_080116_chat_assistant'
  },
];
