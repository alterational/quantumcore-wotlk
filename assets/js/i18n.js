/* ==========================================================================
   QuantumCore Armory — справочные таблицы и локализация (ruRU / enUS)
   Данные соответствуют клиенту World of Warcraft 3.3.5a (build 12340).
   ========================================================================== */
(function (global) {
  'use strict';

  var L = {};

  /* ----------------------------- интерфейс ------------------------------- */

  var UI = {
    ru: {
      siteTitle: 'QuantumCore Armory',
      siteSubtitle: 'World of Warcraft 3.3.5a',
      nav_catalog: 'Каталог',
      nav_doll: 'Кукла персонажа',
      nav_compare: 'Сравнение',
      nav_qc: 'QC 13.1',
      nav_public: 'Public',
      nav_wowdm: 'WoWDM',
      nav_about: 'О базе',
      qc_title: 'QC 13.1 — отдельный дамп',
      qc_note: 'Предметы из другого дампа того же сервера (Quantum Database Rev 9.8, 30.11.2015). ' +
        'Они хранятся отдельно от основной базы: совпадающие entry не перезаписывают и не заменяют друг друга, ' +
        'поэтому оба варианта предмета доступны одновременно. Цифры у совпадающих entry могут отличаться — ' +
        'это разные ревизии одной базы.',
      qc_badge: 'QC 13.1',
      qc_badge_hint: 'Предмет из отдельного дампа sql/qc131.sql',
      qc_total: 'Предметов в QC 13.1',
      qc_open: 'Открыть каталог QC 13.1',
      qc_dump_link: 'скачать sql-файл QC 13.1',
      qc_about: 'Дамп QC 13.1 собран из world.sql (Quantum Database Rev 9.8, 30.11.2015) и отличается ' +
        'от основной базы: часть entry принадлежит совсем другим предметам, поэтому такие совпадения ' +
        'показаны отдельной пометкой, а не подменяют название.',
      pub_title: 'Public — сборный дамп',
      pub_note: 'Набор предметов из внешних дампов того же сервера (форумы, nopaste, GitHub-паки). ' +
        'Хранится отдельно: совпадающие entry не перезаписывают ни основную базу, ни QC 13.1 — ' +
        'все версии видны одновременно.',
      pub_badge: 'Public',
      pub_badge_hint: 'Предмет из отдельного дампа sql/public.sql',
      pub_about: 'Публичный набор собран из внешних дампов item_template (форумы, зеркала, ' +
        'GitHub-паки). Значительная часть записей использует оригинальные номера Blizzard, поэтому ' +
        'предметы хранятся отдельно и не заменяют ни основную базу, ни QC 13.1.',
      pub_locked_title: 'Раздел Public защищён паролем',
      wowdm_title: 'WoWDM — отдельный раздел',
      wowdm_note: 'Самостоятельный набор предметов под паролем. Хранится отдельно: совпадающие ' +
        'entry не перезаписывают ни основную базу, ни QC 13.1, ни Public — все версии видны ' +
        'одновременно.',
      wowdm_badge: 'WoWDM',
      wowdm_badge_hint: 'Предмет из раздела WoWDM',
      wowdm_about: 'Раздел WoWDM — самостоятельный набор предметов, отдельный от всех остальных. ' +
        'Сейчас в нём нет предметов: как только появится дамп для этого раздела, он будет собран ' +
        'сюда собственным набором и ничего не затронет.',
      sec_empty_text: 'В этом разделе пока нет предметов — для него ещё не добавлены данные.',
      sec_empty_hint: 'Раздел уже готов: как только дамп появится, предметы соберутся сюда ' +
        'отдельным набором со своими ключами и не затронут основную базу, QC 13.1 и Public.',
      sec_empty_short: 'Данных пока нет',
      wowdm_locked_title: 'Раздел WoWDM защищён паролем',
      lock_text: 'Введите пароль в бокс ниже, чтобы открыть раздел.',
      lock_placeholder: 'Пароль',
      lock_submit: 'Открыть',
      lock_ok: 'Пароль принят, открываю раздел…',
      lock_error: 'Неверный пароль.',
      lock_note: 'Данные раздела — обычный файл сайта, поэтому пароль скрывает раздел ' +
        'от случайного просмотра, но не заменяет защиту сервера.',
      lock_btn: 'Заблокировать раздел',
      lock_hint_open: 'Раздел открыт',
      lock_hint_locked: 'Раздел защищён паролем',
      lock_title_short: 'Открыть по паролю',
      sec_total: 'Предметов в разделе',
      sec_open: 'Открыть каталог',
      sec_dump_link: 'скачать sql-файл',
      name_ru_server: 'Русское название (локализация сервера)',
      desc_ru_hint: 'Описание из локализации сервера (RU)',
      entry_conflict_title: 'Совпадение entry:',
      entry_conflict_text: 'в современной базе Wowhead запись {entry} — это «{name}», то есть другой предмет. ' +
        'Названия Wowhead для этого предмета не подставлялись.',
      entry_conflict_hint: 'Предмет мог быть переопределён в дампе именно этого сервера.',
      search_placeholder: 'Поиск по названию, идентификатору, статам…',
      filters: 'Фильтры',
      filter_class: 'Тип',
      filter_slot: 'Слот',
      filter_quality: 'Качество',
      filter_set: 'Комплект',
      filter_ilvl_min: 'Ур. предмета от',
      filter_ilvl_max: 'до',
      filter_flags: 'Особенности',
      flag_has_spells: 'Со спецэффектами',
      flag_has_sockets: 'С гнёздами',
      flag_has_set: 'В комплекте',
      flag_equipable: 'Можно надеть',
      flag_unique: 'Уникальные',
      sort: 'Сортировка',
      sort_ilvl: 'по уровню предмета',
      sort_name: 'по названию',
      sort_dps: 'по урону в секунду',
      sort_armor: 'по броне',
      sort_id: 'по идентификатору',
      reset: 'Сбросить',
      found: 'Найдено предметов:',
      of: 'из',
      col_item: 'Предмет',
      col_ilvl: 'Ур.',
      col_slot: 'Слот',
      col_type: 'Тип',
      col_stats: 'Основные характеристики',
      col_actions: 'Действия',
      action_open: 'Открыть',
      action_equip: 'Надеть',
      action_unequip: 'Снять',
      action_compare: 'Сравнить',
      action_remove: 'Убрать',
      action_clear: 'Очистить',
      all: 'Все',
      any: 'Любой',
      item_level: 'Уровень предмета',
      requires_level: 'Требуется уровень',
      durability: 'Прочность',
      sell_price: 'Цена продажи',
      buy_price: 'Цена покупки',
      unique: 'Уникальный',
      unique_equipped: 'Уникальный: можно надеть только один',
      set_bonus: 'Бонус гнезда',
      container_slots: 'ячеек',
      sockets: 'Гнёзда',
      bindings: 'Привязка',
      classes: 'Классы',
      races: 'Расы',
      spells_effects: 'Спецэффекты',
      trigger_use: 'Использование',
      trigger_equip: 'Если надет',
      trigger_chance: 'Вероятность при попадании',
      trigger_soulbound: 'Привязка',
      trigger_learn: 'Изучение',
      cooldown: 'Перезарядка',
      charges: 'Заряды',
      ppm: 'Срабатываний в минуту',
      duration: 'Длительность',
      proc_chance: 'Шанс срабатывания',
      params_title: 'Параметры записи item_template',
      params_hint: 'Показаны все заполненные поля записи предмета из базы сервера.',
      param_col: 'Поле',
      param_value: 'Значение',
      param_meaning: 'Расшифровка',
      filter_subclass: 'Подтип',
      tab_summary: 'Сводка',
      tab_spells: 'Спецэффекты',
      tab_set: 'Комплект',
      tab_params: 'Параметры базы',
      tab_sim: 'Кукла',
      names_title: 'Названия',
      name_db: 'Название в базе сервера',
      name_wowhead_ru: 'Название на Wowhead (RU)',
      name_wowhead_en: 'Название на Wowhead (EN)',
      name_custom: 'Собственный предмет сервера — в базе Wowhead отсутствует',
      name_matched_id: 'Совпадение по номеру предмета',
      name_matched_name: 'Найдено совпадение по названию',
      wowhead_open: 'Открыть на Wowhead',
      wowhead_search: 'Поиск на Wowhead',
      copy_link: 'Скопировать ссылку',
      link_copied: 'Ссылка скопирована',
      doll_title: 'Кукла персонажа',
      doll_hint: 'Нажимайте «Надеть» в каталоге или выбирайте предметы прямо в слотах.',
      doll_empty: 'пусто',
      doll_clear: 'Снять всё',
      doll_save: 'Сохранить ссылку',
      doll_slots: 'Слотов занято',
      char_class: 'Класс',
      char_race: 'Раса',
      char_level: 'Уровень',
      char_none: '— не указан —',
      stat_total: 'Суммарные характеристики',
      stat_item_level: 'Средний уровень предметов',
      stat_armor: 'Броня',
      stat_dps: 'Урон в секунду (правая рука)',
      stat_stamina_hp: 'Здоровье от выносливости',
      stat_resist: 'Сопротивления',
      stat_ratings: 'Рейтинги',
      stat_primary: 'Основные характеристики',
      stat_no_items: 'На кукле пока нет предметов.',
      incompatible: 'Нельзя надеть: не подходит по классу, расе или уровню',
      compare_title: 'Сравнение предметов',
      compare_hint: 'Добавьте до четырёх предметов из каталога кнопкой «Сравнить».',
      compare_add: 'Добавить предмет',
      compare_none: 'Список сравнения пуст',
      compare_param: 'Параметр',
      about_title: 'О базе',
      footer_note: 'Данные: дамп item_template (YDBC/YTDB < 600) игрового мира Wonder WoW. Описания заклинаний и названия предметов — из клиента World of Warcraft 3.3.5a и Wowhead.',
      loading: 'Загрузка данных…',
      error_load: 'Не удалось загрузить файл данных data/db.json',
      items_total: 'Предметов в базе',
      spells_total: 'Заклинаний',
      sets_total: 'Комплектов',
      sources: 'Источники',
      secondary_names: 'Вторичные названия',
      language: 'Язык',
      equip_warning: 'Часть предметов недоступна выбранному персонажу',
      speed: 'Скорость',
      damage: 'Урон',
      dps: 'Урон в секунду',
      armor_label: 'Броня',
      block_label: 'Блок',
      range: 'Дистанция',
      stat_value: 'Значение',
      reset_filters: 'Сбросить фильтры',
      nothing_found: 'Ничего не найдено — измените условия поиска.',
      item_id: 'Номер предмета',
      display_id: 'Идентификатор модели',
      set_items: 'Предметы комплекта',
      set_bonuses: 'Бонусы комплекта',
      set_progress: 'Надето предметов комплекта',
      equip_in_slot: 'Надеть в слот',
      no_slot: 'Этот предмет не надевается',
      slot_hint: 'Слот',
      added_to_compare: 'Предмет добавлен к сравнению',
      in_compare: 'Уже в сравнении',
      compare_full: 'В сравнении уже четыре предмета',
      unknown: 'неизвестно'
    },
    en: {
      siteTitle: 'QuantumCore Armory',
      siteSubtitle: 'World of Warcraft 3.3.5a',
      nav_catalog: 'Items',
      nav_doll: 'Character',
      nav_compare: 'Compare',
      nav_qc: 'QC 13.1',
      nav_about: 'About',
      qc_title: 'QC 13.1 — separate dump',
      qc_note: 'Items from another dump of the same server (Quantum Database Rev 9.8, 30.11.2015). ' +
        'They are kept apart from the main database: identical entries never overwrite each other, ' +
        'so both versions of an item stay available. Stats of colliding entries may differ — ' +
        'the two dumps are different revisions of one database.',
      qc_badge: 'QC 13.1',
      qc_badge_hint: 'Item from the separate dump sql/qc131.sql',
      qc_total: 'QC 13.1 items',
      qc_open: 'Open the QC 13.1 catalogue',
      qc_dump_link: 'download the QC 13.1 sql file',
      qc_about: 'The QC 13.1 dump comes from world.sql (Quantum Database Rev 9.8, 30.11.2015) and differs ' +
        'from the main database: some entries belong to entirely different items, so such collisions are ' +
        'flagged instead of replacing the name.',
      nav_public: 'Public',
      nav_wowdm: 'WoWDM',
      pub_title: 'Public — merged dump',
      pub_note: 'A set of items from external dumps of the same server (forums, nopaste, GitHub packs). ' +
        'Kept separately: identical entries never overwrite the main database or QC 13.1, so every ' +
        'version stays available.',
      pub_badge: 'Public',
      pub_badge_hint: 'Item from the separate dump sql/public.sql',
      pub_about: 'The public set is merged from external item_template dumps (forums, mirrors, ' +
        'GitHub packs). Many records reuse original Blizzard entries, so the items are kept separately ' +
        'and never replace the main database or QC 13.1.',
      pub_locked_title: 'The Public section is password protected',
      wowdm_title: 'WoWDM — separate section',
      wowdm_note: 'An independent item set behind the password. Kept separately: identical entries ' +
        'never overwrite the main database, QC 13.1 or Public — every version stays available.',
      wowdm_badge: 'WoWDM',
      wowdm_badge_hint: 'Item from the WoWDM section',
      wowdm_about: 'The WoWDM section is an item set of its own, separate from every other one. ' +
        'It holds no items yet: once a dump for this section arrives, it will be built here as its ' +
        'own set and will touch nothing else.',
      sec_empty_text: 'This section has no items yet — no data has been added for it.',
      sec_empty_hint: 'The section is ready: once a dump appears, its items will be built here as a ' +
        'separate set with its own keys and will not affect the main database, QC 13.1 or Public.',
      sec_empty_short: 'No data yet',
      wowdm_locked_title: 'The WoWDM section is password protected',
      lock_text: 'Type the password in the box below to open the section.',
      lock_placeholder: 'Password',
      lock_submit: 'Open',
      lock_ok: 'Password accepted, opening the section…',
      lock_error: 'Wrong password.',
      lock_note: 'The section data is a plain file of this site, so the password hides it from ' +
        'casual visitors rather than replacing server-side protection.',
      lock_btn: 'Lock the section',
      lock_hint_open: 'The section is unlocked',
      lock_hint_locked: 'The section is password protected',
      lock_title_short: 'Open with a password',
      sec_total: 'Items in the section',
      sec_open: 'Open the catalogue',
      sec_dump_link: 'download the sql file',
      name_ru_server: 'Russian name (server localisation)',
      desc_ru_hint: 'Description from the server localisation (RU)',
      entry_conflict_title: 'Entry collision:',
      entry_conflict_text: 'in the current Wowhead data entry {entry} is "{name}", a different item. ' +
        'Wowhead names were not applied to this item.',
      entry_conflict_hint: 'The server dump may have redefined this entry.',
      search_placeholder: 'Search by name, id, stats…',
      filters: 'Filters',
      filter_class: 'Type',
      filter_slot: 'Slot',
      filter_quality: 'Quality',
      filter_set: 'Set',
      filter_ilvl_min: 'Item level from',
      filter_ilvl_max: 'to',
      filter_flags: 'Options',
      flag_has_spells: 'With effects',
      flag_has_sockets: 'With sockets',
      flag_has_set: 'In a set',
      flag_equipable: 'Equippable',
      flag_unique: 'Unique',
      sort: 'Sort',
      sort_ilvl: 'by item level',
      sort_name: 'by name',
      sort_dps: 'by damage per second',
      sort_armor: 'by armor',
      sort_id: 'by id',
      reset: 'Reset',
      found: 'Items found:',
      of: 'of',
      col_item: 'Item',
      col_ilvl: 'iLvl',
      col_slot: 'Slot',
      col_type: 'Type',
      col_stats: 'Main stats',
      col_actions: 'Actions',
      action_open: 'Open',
      action_equip: 'Equip',
      action_unequip: 'Unequip',
      action_compare: 'Compare',
      action_remove: 'Remove',
      action_clear: 'Clear',
      all: 'All',
      any: 'Any',
      item_level: 'Item Level',
      requires_level: 'Requires Level',
      durability: 'Durability',
      sell_price: 'Sell Price',
      buy_price: 'Buy Price',
      unique: 'Unique',
      unique_equipped: 'Unique-Equipped',
      set_bonus: 'Socket Bonus',
      container_slots: 'slots',
      sockets: 'Sockets',
      bindings: 'Binding',
      classes: 'Classes',
      races: 'Races',
      spells_effects: 'Effects',
      trigger_use: 'Use',
      trigger_equip: 'Equip',
      trigger_chance: 'Chance on hit',
      trigger_soulbound: 'Soulbound',
      trigger_learn: 'Learn',
      cooldown: 'Cooldown',
      charges: 'Charges',
      ppm: 'Procs per minute',
      duration: 'Duration',
      proc_chance: 'Proc chance',
      params_title: 'item_template record',
      params_hint: 'Every non-empty column of the item record in the server database.',
      param_col: 'Column',
      param_value: 'Value',
      param_meaning: 'Meaning',
      filter_subclass: 'Subtype',
      tab_summary: 'Summary',
      tab_spells: 'Effects',
      tab_set: 'Set',
      tab_params: 'DB record',
      tab_sim: 'Doll',
      names_title: 'Names',
      name_db: 'Name in the server database',
      name_wowhead_ru: 'Wowhead name (RU)',
      name_wowhead_en: 'Wowhead name (EN)',
      name_custom: 'Custom server item — not present in the Wowhead database',
      name_matched_id: 'Matched by item id',
      name_matched_name: 'Matched by name',
      wowhead_open: 'Open on Wowhead',
      wowhead_search: 'Search on Wowhead',
      copy_link: 'Copy link',
      link_copied: 'Link copied',
      doll_title: 'Character doll',
      doll_hint: 'Use “Equip” in the catalogue or pick items directly in the slots.',
      doll_empty: 'empty',
      doll_clear: 'Remove all',
      doll_save: 'Save link',
      doll_slots: 'Slots filled',
      char_class: 'Class',
      char_race: 'Race',
      char_level: 'Level',
      char_none: '— not set —',
      stat_total: 'Total stats',
      stat_item_level: 'Average item level',
      stat_armor: 'Armor',
      stat_dps: 'Damage per second (main hand)',
      stat_stamina_hp: 'Health from stamina',
      stat_resist: 'Resistances',
      stat_ratings: 'Ratings',
      stat_primary: 'Primary stats',
      stat_no_items: 'No items equipped yet.',
      incompatible: 'Cannot equip: class, race or level requirement',
      compare_title: 'Item comparison',
      compare_hint: 'Add up to four items from the catalogue with the “Compare” button.',
      compare_add: 'Add item',
      compare_none: 'Comparison list is empty',
      compare_param: 'Parameter',
      about_title: 'About',
      footer_note: 'Data: item_template dump (YDBC/YTDB < 600) of the Wonder WoW realm. Spell descriptions and item names come from the World of Warcraft 3.3.5a client and Wowhead.',
      loading: 'Loading data…',
      error_load: 'Could not load data/db.json',
      items_total: 'Items in database',
      spells_total: 'Spells',
      sets_total: 'Item sets',
      sources: 'Sources',
      secondary_names: 'Secondary names',
      language: 'Language',
      equip_warning: 'Some items cannot be used by the selected character',
      speed: 'Speed',
      damage: 'Damage',
      dps: 'Damage per second',
      armor_label: 'Armor',
      block_label: 'Block',
      range: 'Range',
      stat_value: 'Value',
      reset_filters: 'Reset filters',
      nothing_found: 'Nothing found — change the search conditions.',
      item_id: 'Item id',
      display_id: 'Display id',
      set_items: 'Set items',
      set_bonuses: 'Set bonuses',
      set_progress: 'Set items equipped',
      equip_in_slot: 'Equip in slot',
      no_slot: 'This item is not equippable',
      slot_hint: 'Slot',
      added_to_compare: 'Item added to comparison',
      in_compare: 'Already in comparison',
      compare_full: 'Comparison already has four items',
      unknown: 'unknown'
    }
  };

  /* ----------------------------- качества --------------------------------- */

  var QUALITY = {
    ru: ['Убогое', 'Обычное', 'Необычное', 'Редкое', 'Эпическое', 'Легендарное', 'Артефакт', 'Наследуемое'],
    en: ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom']
  };

  /* ------------------------------- классы --------------------------------- */

  var CLASS = {
    ru: {
      0: 'Расходуемый', 1: 'Контейнер', 2: 'Оружие', 3: 'Самоцвет', 4: 'Броня', 5: 'Реагент',
      6: 'Боеприпас', 7: 'Хозяйственные товары', 9: 'Рецепт', 11: 'Колчан', 12: 'Задание',
      13: 'Ключ', 15: 'Разное', 16: 'Символ', 17: 'Питомец'
    },
    en: {
      0: 'Consumable', 1: 'Container', 2: 'Weapon', 3: 'Gem', 4: 'Armor', 5: 'Reagent',
      6: 'Projectile', 7: 'Trade Goods', 9: 'Recipe', 11: 'Quiver', 12: 'Quest', 13: 'Key',
      15: 'Miscellaneous', 16: 'Glyph', 17: 'Battle Pet'
    }
  };

  var SUBCLASS = {
    ru: {
      '2:0': 'Топор (одноручное)', '2:1': 'Топор (двуручное)', '2:2': 'Лук', '2:3': 'Ружьё',
      '2:4': 'Дробящее (одноручное)', '2:5': 'Дробящее (двуручное)', '2:6': 'Древковое оружие',
      '2:7': 'Меч (одноручный)', '2:8': 'Меч (двуручный)', '2:10': 'Посох', '2:13': 'Кистевое оружие',
      '2:14': 'Разное', '2:15': 'Кинжал', '2:16': 'Метательное оружие', '2:18': 'Арбалет',
      '2:19': 'Жезл', '2:20': 'Удочка',
      '4:0': 'Разное', '4:1': 'Ткань', '4:2': 'Кожа', '4:3': 'Кольчуга', '4:4': 'Латы',
      '4:5': 'Баклер', '4:6': 'Щит', '4:7': 'Манускрипт', '4:8': 'Идол', '4:9': 'Тотем', '4:10': 'Печать',
      '6:2': 'Стрела', '6:3': 'Пуля', '1:0': 'Сумка', '0:0': 'Расходуемый',
      '15:0': 'Разное', '15:1': 'Реагент', '15:2': 'Предмет задания', '15:4': 'Разное',
      '15:5': 'Средство передвижения',
      '0:8': 'Разное', '7:0': 'Хозяйственные товары', '7:10': 'Стихии', '7:12': 'Наложение чар',
      '12:0': 'Задание',
      '0:1': 'Зелья', '0:2': 'Эликсиры', '0:3': 'Настойки', '0:4': 'Свитки',
      '0:5': 'Еда и напитки', '0:6': 'Улучшения', '0:7': 'Бинты', '1:1': 'Сумка душ',
      '1:2': 'Сумка травника', '1:3': 'Сумка зачаровывателя', '1:4': 'Сумка инженера', '1:5': 'Сумка ювелира',
      '1:6': 'Сумка шахтера', '1:7': 'Сумка кожевника', '1:8': 'Сумка начертателя', '2:9': 'Устаревшие',
      '2:11': 'Экзотическое', '2:12': 'Экзотическое', '2:17': 'Копье', '3:0': 'Красные',
      '3:1': 'Синие', '3:2': 'Желтые', '3:3': 'Фиолетовые', '3:4': 'Зеленые',
      '3:5': 'Оранжевые', '3:6': 'Особые', '3:7': 'Простые', '3:8': 'Радужные',
      '5:0': 'Реагент', '6:0': 'Жезл(НЕ ИСП.)', '6:1': 'Болт(НЕ ИСП.)', '6:4': 'Метательное(НЕ ИСП.)',
      '7:1': 'Детали', '7:2': 'Взрывчатка', '7:3': 'Устройства', '7:4': 'Ювелирное дело',
      '7:5': 'Ткань', '7:6': 'Кожа', '7:7': 'Металл и камень', '7:8': 'Мясо',
      '7:9': 'Трава', '7:11': 'Другое', '7:13': 'Материалы', '7:14': 'Чары для доспехов',
      '7:15': 'Чары для оружия', '8:0': 'Стандартный(НЕ ИСП.)', '9:0': 'Книга', '9:1': 'Кожевничество',
      '9:2': 'Портняжное дело', '9:3': 'Инженерное дело', '9:4': 'Кузнечное дело', '9:5': 'Кулинария',
      '9:6': 'Алхимия', '9:7': 'Первая помощь', '9:8': 'Наложение чар', '9:9': 'Рыбная ловля',
      '9:10': 'Ювелирное дело', '9:11': 'Начертание', '10:0': 'Деньги (НЕ ИСП.)', '11:0': 'Колчан(НЕ ИСП.)',
      '11:1': 'Колчан(НЕ ИСП.)', '11:2': 'Колчан', '11:3': 'Подсумок', '13:0': 'Ключ',
      '13:1': 'Отмычка', '14:0': 'Постоянные', '15:3': 'Праздничные предметы', '16:1': 'Воин',
      '16:2': 'Паладин', '16:3': 'Охотник', '16:4': 'Разбойник', '16:5': 'Жрец',
      '16:6': 'Рыцарь смерти', '16:7': 'Шаман', '16:8': 'Маг', '16:9': 'Чернокнижник',
      '16:11': 'Друид'
    },
    en: {
      '2:0': 'One-Handed Axe', '2:1': 'Two-Handed Axe', '2:2': 'Bow', '2:3': 'Gun',
      '2:4': 'One-Handed Mace', '2:5': 'Two-Handed Mace', '2:6': 'Polearm', '2:7': 'One-Handed Sword',
      '2:8': 'Two-Handed Sword', '2:10': 'Staff', '2:13': 'Fist Weapon', '2:14': 'Miscellaneous',
      '2:15': 'Dagger', '2:16': 'Thrown', '2:18': 'Crossbow', '2:19': 'Wand', '2:20': 'Fishing Pole',
      '4:0': 'Miscellaneous', '4:1': 'Cloth', '4:2': 'Leather', '4:3': 'Mail', '4:4': 'Plate',
      '4:5': 'Buckler', '4:6': 'Shield', '4:7': 'Libram', '4:8': 'Idol', '4:9': 'Totem', '4:10': 'Sigil',
      '6:2': 'Arrow', '6:3': 'Bullet', '1:0': 'Bag', '0:0': 'Consumable',
      '15:0': 'Junk', '15:1': 'Reagent', '15:2': 'Quest', '15:4': 'Miscellaneous',
      '15:5': 'Mount',
      '0:8': 'Other', '7:0': 'Trade Goods', '7:10': 'Elemental', '7:12': 'Enchanting',
      '12:0': 'Quest',
      '0:1': 'Potion', '0:2': 'Elixir', '0:3': 'Flask', '0:4': 'Scroll',
      '0:5': 'Food & Drink', '0:6': 'Item Enhancement', '0:7': 'Bandage', '1:1': 'Soul Bag',
      '1:2': 'Herb Bag', '1:3': 'Enchanting Bag', '1:4': 'Engineering Bag', '1:5': 'Gem Bag',
      '1:6': 'Mining Bag', '1:7': 'Leatherworking Bag', '1:8': 'Inscription Bag', '2:9': 'Obsolete',
      '2:11': 'Exotic', '2:12': 'Exotic', '2:17': 'Spear', '3:0': 'Red',
      '3:1': 'Blue', '3:2': 'Yellow', '3:3': 'Purple', '3:4': 'Green',
      '3:5': 'Orange', '3:6': 'Meta', '3:7': 'Simple', '3:8': 'Prismatic',
      '5:0': 'Reagent', '6:0': 'Wand(OBSOLETE)', '6:1': 'Bolt(OBSOLETE)', '6:4': 'Thrown(OBSOLETE)',
      '7:1': 'Parts', '7:2': 'Explosives', '7:3': 'Devices', '7:4': 'Jewelcrafting',
      '7:5': 'Cloth', '7:6': 'Leather', '7:7': 'Metal & Stone', '7:8': 'Meat',
      '7:9': 'Herb', '7:11': 'Other', '7:13': 'Materials', '7:14': 'Armor Enchantment',
      '7:15': 'Weapon Enchantment', '8:0': 'Generic(OBSOLETE)', '9:0': 'Book', '9:1': 'Leatherworking',
      '9:2': 'Tailoring', '9:3': 'Engineering', '9:4': 'Blacksmithing', '9:5': 'Cooking',
      '9:6': 'Alchemy', '9:7': 'First Aid', '9:8': 'Enchanting', '9:9': 'Fishing',
      '9:10': 'Jewelcrafting', '9:11': 'Inscription', '10:0': 'Money(OBSOLETE)', '11:0': 'Quiver(OBSOLETE)',
      '11:1': 'Quiver(OBSOLETE)', '11:2': 'Quiver', '11:3': 'Ammo Pouch', '13:0': 'Key',
      '13:1': 'Lockpick', '14:0': 'Permanent', '15:3': 'Holiday', '16:1': 'Warrior',
      '16:2': 'Paladin', '16:3': 'Hunter', '16:4': 'Rogue', '16:5': 'Priest',
      '16:6': 'Death Knight', '16:7': 'Shaman', '16:8': 'Mage', '16:9': 'Warlock',
      '16:11': 'Druid'
    }
  };

  /* --------------------------------- слоты -------------------------------- */

  var SLOT = {
    ru: {
      0: 'Не надевается', 1: 'Голова', 2: 'Шея', 3: 'Плечи', 4: 'Рубашка', 5: 'Грудь',
      6: 'Пояс', 7: 'Ноги', 8: 'Ступни', 9: 'Запястья', 10: 'Кисти рук', 11: 'Палец',
      12: 'Аксессуар', 13: 'Одноручное', 14: 'Щит', 15: 'Дальний бой', 16: 'Спина',
      17: 'Двуручное', 18: 'Сумка', 19: 'Гербовая накидка', 20: 'Одеяние', 21: 'Правая рука',
      22: 'Левая рука', 23: 'Левая рука (держать)', 24: 'Боеприпас', 25: 'Метательное',
      26: 'Дальний бой (правая рука)', 28: 'Реликвия'
    },
    en: {
      0: 'Non-equippable', 1: 'Head', 2: 'Neck', 3: 'Shoulder', 4: 'Shirt', 5: 'Chest', 6: 'Waist',
      7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands', 11: 'Finger', 12: 'Trinket', 13: 'One-Hand',
      14: 'Shield', 15: 'Ranged', 16: 'Back', 17: 'Two-Hand', 18: 'Bag', 19: 'Tabard', 20: 'Robe',
      21: 'Main Hand', 22: 'Off Hand', 23: 'Held In Off-hand', 24: 'Ammo', 25: 'Thrown',
      26: 'Ranged (main hand)', 28: 'Relic'
    }
  };

  /* ---------------------------- характеристики ---------------------------- */

  var STAT = {
    3: { ru: 'Ловкость', en: 'Agility', kind: 'primary' },
    4: { ru: 'Сила', en: 'Strength', kind: 'primary' },
    5: { ru: 'Интеллект', en: 'Intellect', kind: 'primary' },
    6: { ru: 'Дух', en: 'Spirit', kind: 'primary' },
    7: { ru: 'Выносливость', en: 'Stamina', kind: 'primary' },
    12: { ru: 'Рейтинг защиты', en: 'Defense Rating', kind: 'rating' },
    13: { ru: 'Рейтинг уклонения', en: 'Dodge Rating', kind: 'rating' },
    14: { ru: 'Рейтинг парирования', en: 'Parry Rating', kind: 'rating' },
    15: { ru: 'Рейтинг блокирования', en: 'Block Rating', kind: 'rating' },
    16: { ru: 'Рейтинг меткости (ближний бой)', en: 'Melee Hit Rating', kind: 'hit' },
    17: { ru: 'Рейтинг меткости (дальний бой)', en: 'Ranged Hit Rating', kind: 'hit' },
    18: { ru: 'Рейтинг меткости (заклинания)', en: 'Spell Hit Rating', kind: 'hit' },
    19: { ru: 'Рейтинг крит. удара (ближний бой)', en: 'Melee Crit Rating', kind: 'crit' },
    20: { ru: 'Рейтинг крит. удара (дальний бой)', en: 'Ranged Crit Rating', kind: 'crit' },
    21: { ru: 'Рейтинг крит. удара (заклинания)', en: 'Spell Crit Rating', kind: 'crit' },
    22: { ru: 'Рейтинг меткости по вам (ближний бой)', en: 'Melee Hit Taken Rating', kind: 'other' },
    23: { ru: 'Рейтинг меткости по вам (дальний бой)', en: 'Ranged Hit Taken Rating', kind: 'other' },
    24: { ru: 'Рейтинг меткости по вам (заклинания)', en: 'Spell Hit Taken Rating', kind: 'other' },
    25: { ru: 'Рейтинг крит. удара по вам (ближний бой)', en: 'Melee Crit Taken Rating', kind: 'other' },
    26: { ru: 'Рейтинг крит. удара по вам (дальний бой)', en: 'Ranged Crit Taken Rating', kind: 'other' },
    27: { ru: 'Рейтинг крит. удара по вам (заклинания)', en: 'Spell Crit Taken Rating', kind: 'other' },
    28: { ru: 'Рейтинг скорости (ближний бой)', en: 'Melee Haste Rating', kind: 'haste' },
    29: { ru: 'Рейтинг скорости (дальний бой)', en: 'Ranged Haste Rating', kind: 'haste' },
    30: { ru: 'Рейтинг скорости (заклинания)', en: 'Spell Haste Rating', kind: 'haste' },
    31: { ru: 'Рейтинг меткости', en: 'Hit Rating', kind: 'hit' },
    32: { ru: 'Рейтинг критического удара', en: 'Crit Rating', kind: 'crit' },
    35: { ru: 'Рейтинг устойчивости', en: 'Resilience Rating', kind: 'other' },
    36: { ru: 'Рейтинг скорости', en: 'Haste Rating', kind: 'haste' },
    37: { ru: 'Рейтинг мастерства', en: 'Expertise Rating', kind: 'other' },
    38: { ru: 'Сила атаки', en: 'Attack Power', kind: 'power' },
    39: { ru: 'Сила атаки (дальний бой)', en: 'Ranged Attack Power', kind: 'power' },
    41: { ru: 'Эффект исцеления', en: 'Spell Healing Done', kind: 'power' },
    42: { ru: 'Эффект урона заклинаний', en: 'Spell Damage Done', kind: 'power' },
    43: { ru: 'Восполнение маны за 5 сек.', en: 'Mana Regeneration', kind: 'regen' },
    44: { ru: 'Рейтинг пробивания брони', en: 'Armor Penetration Rating', kind: 'other' },
    45: { ru: 'Сила заклинаний', en: 'Spell Power', kind: 'power' },
    46: { ru: 'Восстановление здоровья', en: 'Health Regeneration', kind: 'regen' },
    47: { ru: 'Проникающая способность заклинаний', en: 'Spell Penetration', kind: 'other' },
    48: { ru: 'Показатель блокирования', en: 'Block Value', kind: 'other' }
  };

  /* форма отображения характеристики: «+50 к выносливости» / «+50 Stamina» */
  var STAT_PHRASE = {
    3: ['к ловкости', 'Agility'], 4: ['к силе', 'Strength'], 5: ['к интеллекту', 'Intellect'],
    6: ['к духу', 'Spirit'], 7: ['к выносливости', 'Stamina'],
    12: ['к рейтингу защиты', 'Defense Rating'], 13: ['к рейтингу уклонения', 'Dodge Rating'],
    14: ['к рейтингу парирования', 'Parry Rating'], 15: ['к рейтингу блокирования', 'Block Rating'],
    16: ['к рейтингу меткости', 'Hit Rating'], 17: ['к рейтингу меткости', 'Hit Rating'],
    18: ['к рейтингу меткости', 'Hit Rating'], 19: ['к рейтингу критического удара', 'Crit Rating'],
    20: ['к рейтингу критического удара', 'Crit Rating'], 21: ['к рейтингу критического удара', 'Crit Rating'],
    22: ['к рейтингу меткости (получаемой)', 'Hit Taken Rating'], 23: ['к рейтингу меткости (получаемой)', 'Hit Taken Rating'],
    24: ['к рейтингу меткости (получаемой)', 'Hit Taken Rating'],
    25: ['к рейтингу критического удара (получаемого)', 'Crit Taken Rating'],
    26: ['к рейтингу критического удара (получаемого)', 'Crit Taken Rating'],
    27: ['к рейтингу критического удара (получаемого)', 'Crit Taken Rating'],
    28: ['к рейтингу скорости', 'Haste Rating'], 29: ['к рейтингу скорости', 'Haste Rating'],
    30: ['к рейтингу скорости', 'Haste Rating'], 31: ['к рейтингу меткости', 'Hit Rating'],
    32: ['к рейтингу критического удара', 'Crit Rating'], 35: ['к рейтингу устойчивости', 'Resilience Rating'],
    36: ['к рейтингу скорости', 'Haste Rating'], 37: ['к рейтингу мастерства', 'Expertise Rating'],
    38: ['к силе атаки', 'Attack Power'], 39: ['к силе атаки (дальний бой)', 'Ranged Attack Power'],
    41: ['к эффекту исцеления', 'Healing Power'], 42: ['к эффекту урона заклинаний', 'Spell Damage'],
    43: ['к восполнению маны за 5 сек.', 'Mana per 5 sec'], 44: ['к рейтингу пробивания брони', 'Armor Penetration'],
    45: ['к силе заклинаний', 'Spell Power'], 46: ['к восстановлению здоровья за 5 сек.', 'Health per 5 sec'],
    47: ['к проникающей способности заклинаний', 'Spell Penetration'], 48: ['к показателю блокирования', 'Block Value']
  };

  var DAMAGE_TYPE = {
    ru: ['Физический', 'Свет', 'Огонь', 'Природа', 'Лёд', 'Тьма', 'Тайная магия'],
    en: ['Physical', 'Holy', 'Fire', 'Nature', 'Frost', 'Shadow', 'Arcane']
  };

  var SOCKET = {
    1: { ru: 'Особое', en: 'Meta', css: 'meta' },
    2: { ru: 'Красное', en: 'Red', css: 'red' },
    4: { ru: 'Жёлтое', en: 'Yellow', css: 'yellow' },
    8: { ru: 'Синее', en: 'Blue', css: 'blue' }
  };

  var BONDING = {
    ru: { 0: 'Без привязки', 1: 'Привязка при получении', 2: 'Привязка при надевании', 3: 'Привязка при использовании', 4: 'Предмет задания' },
    en: { 0: 'No binding', 1: 'Binds when picked up', 2: 'Binds when equipped', 3: 'Binds when used', 4: 'Quest item' }
  };

  var RESIST = {
    ru: { holy: 'Свет', fire: 'Огонь', nature: 'Природа', frost: 'Лёд', shadow: 'Тьма', arcane: 'Тайная магия' },
    en: { holy: 'Holy', fire: 'Fire', nature: 'Nature', frost: 'Frost', shadow: 'Shadow', arcane: 'Arcane' }
  };

  /* ----------------------------- флаги предмета --------------------------- */

  var FLAGS = [
    [0x00000002, 'Созданный предмет', 'Conjured'],
    [0x00000004, 'Можно открыть', 'Openable'],
    [0x00000008, 'Пометка «Героический»', 'Heroic tooltip'],
    [0x00000010, 'Устаревший', 'Deprecated'],
    [0x00000020, 'Нельзя уничтожить', 'No user destroy'],
    [0x00000040, 'Применяется игроком', 'Player cast'],
    [0x00000080, 'Без задержки при надевании', 'No equip cooldown'],
    [0x00000200, 'Упаковка', 'Wrapper'],
    [0x00000800, 'Не исчезает при добыче', 'Multi drop'],
    [0x00001000, 'Возврат торговцу', 'Purchase record'],
    [0x00002000, 'Устав / грамота', 'Petition'],
    [0x00004000, 'Есть текст', 'Has text'],
    [0x00008000, 'Нельзя разобрать', 'No disenchant'],
    [0x00080000, 'Уникальный: можно надеть только один', 'Unique-Equipped'],
    [0x00100000, 'Игнорируется аурами', 'Ignore for auras'],
    [0x00200000, 'Разрешён на арене', 'Arena allowed'],
    [0x00400000, 'Без потери прочности', 'No durability loss'],
    [0x00800000, 'Работает в формах зверя', 'Use when shapeshifted'],
    [0x04000000, 'Запрещён на арене', 'Not usable in arena'],
    [0x08000000, 'Привязка к учётной записи', 'Bound to account'],
    [0x10000000, 'Без реагентов', 'No reagent cost']
  ];

  var FLAGS_EXTRA = [
    [0x00000001, 'Только Орда', 'Horde only'],
    [0x00000002, 'Только Альянс', 'Alliance only'],
    [0x00000004, 'Всегда требует золото', 'Never ignore buy price'],
    [0x00000008, 'Классифицируется как заклинатель', 'Classify as caster'],
    [0x00000010, 'Классифицируется как боец', 'Classify as physical']
  ];

  /* ------------------------------ классы/расы ----------------------------- */

  var CLASS_MASK = ['Воин', 'Паладин', 'Охотник', 'Разбойник', 'Жрец', 'Рыцарь смерти', 'Шаман', 'Маг', 'Чернокнижник', 'Друид'];
  var CLASS_MASK_EN = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Druid'];
  var CLASS_BITS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 1024];
  var RACE_MASK = ['Человек', 'Орк', 'Дворф', 'Ночной эльф', 'Нежить', 'Таурен', 'Гном', 'Тролль', 'Эльф крови', 'Дренеи'];
  var RACE_MASK_EN = ['Human', 'Orc', 'Dwarf', 'Night Elf', 'Undead', 'Tauren', 'Gnome', 'Troll', 'Blood Elf', 'Draenei'];
  var RACE_BITS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

  /* ------------------------- описания колонок базы ------------------------ */

  var PARAM_DESC = {
    entry: ['Номер предмета', 'Item id'],
    name: ['Название', 'Name'],
    displayid: ['Номер модели', 'Display id'],
    Quality: ['Качество', 'Quality'],
    ItemLevel: ['Уровень предмета', 'Item level'],
    RequiredLevel: ['Требуемый уровень', 'Required level'],
    class: ['Класс предмета', 'Item class'],
    subclass: ['Подкласс предмета', 'Item subclass'],
    InventoryType: ['Тип слота', 'Inventory type'],
    bonding: ['Привязка', 'Binding'],
    BuyPrice: ['Цена покупки (медь)', 'Buy price (copper)'],
    SellPrice: ['Цена продажи (медь)', 'Sell price (copper)'],
    BuyCount: ['Количество в наборе', 'Buy count'],
    maxcount: ['Уникальность', 'Unique limit'],
    stackable: ['Стопка', 'Stack size'],
    ContainerSlots: ['Ячеек в сумке', 'Container slots'],
    StatsCount: ['Количество характеристик', 'Stats count'],
    armor: ['Броня', 'Armor'],
    block: ['Показатель блокирования', 'Block value'],
    dmg_min1: ['Минимальный урон (1)', 'Min damage (1)'],
    dmg_max1: ['Максимальный урон (1)', 'Max damage (1)'],
    dmg_type1: ['Тип урона (1)', 'Damage type (1)'],
    dmg_min2: ['Минимальный урон (2)', 'Min damage (2)'],
    dmg_max2: ['Максимальный урон (2)', 'Max damage (2)'],
    dmg_type2: ['Тип урона (2)', 'Damage type (2)'],
    delay: ['Скорость оружия (мс)', 'Weapon delay (ms)'],
    ammo_type: ['Тип боеприпасов', 'Ammo type'],
    RangedModRange: ['Модификатор дистанции', 'Ranged mod range'],
    holy_res: ['Сопротивление свету', 'Holy resistance'],
    fire_res: ['Сопротивление огню', 'Fire resistance'],
    nature_res: ['Сопротивление природе', 'Nature resistance'],
    frost_res: ['Сопротивление льду', 'Frost resistance'],
    shadow_res: ['Сопротивление тьме', 'Shadow resistance'],
    arcane_res: ['Сопротивление тайной магии', 'Arcane resistance'],
    MaxDurability: ['Максимальная прочность', 'Max durability'],
    description: ['Описание от сервера', 'Server description'],
    itemset: ['Номер комплекта', 'Item set id'],
    socketBonus: ['Бонус гнёзд (наложение)', 'Socket bonus (enchant)'],
    GemProperties: ['Свойства самоцвета', 'Gem properties'],
    RandomProperty: ['Случайное свойство', 'Random property'],
    RandomSuffix: ['Случайный суффикс', 'Random suffix'],
    RequiredDisenchantSkill: ['Навык разбора', 'Required disenchant skill'],
    DisenchantID: ['Таблица разбора', 'Disenchant id'],
    Material: ['Материал', 'Material'],
    sheath: ['Размещение на поясе', 'Sheath'],
    Flags: ['Флаги предмета', 'Item flags'],
    FlagsExtra: ['Дополнительные флаги', 'Extra flags'],
    AllowableClass: ['Доступные классы (маска)', 'Allowable classes (mask)'],
    AllowableRace: ['Доступные расы (маска)', 'Allowable races (mask)'],
    RequiredSkill: ['Требуемый навык', 'Required skill'],
    RequiredSkillRank: ['Ранг навыка', 'Required skill rank'],
    ScalingStatDistribution: ['Масштабирование характеристик', 'Scaling stat distribution'],
    ScalingStatValue: ['Значения масштабирования', 'Scaling stat value'],
    ItemLimitCategory: ['Категория ограничения', 'Item limit category'],
    MinMoneyLoot: ['Минимум денег в добыче', 'Min money loot'],
    MaxMoneyLoot: ['Максимум денег в добыче', 'Max money loot'],
    flagsCustom: ['Особые флаги сервера', 'Custom flags'],
    startquest: ['Номер задания', 'Start quest'],
    PageText: ['Текст страницы', 'Page text'],
    LockID: ['Замок', 'Lock id'],
    lockid: ['Замок', 'Lock id'],
    FoodType: ['Тип еды', 'Food type'],
    HolidayId: ['Праздник', 'Holiday id'],
    ItemLimitCategoryId: ['Категория ограничения', 'Item limit category'],
    Duration: ['Длительность', 'Duration'],
    BagFamily: ['Семейство сумок', 'Bag family'],
    area: ['Область', 'Area'],
    Map: ['Карта', 'Map'],
    TotemCategory: ['Категория тотема', 'Totem category'],
    ScriptName: ['Скрипт', 'Script name'],
    SoundOverrideSubclass: ['Звук подкласса', 'Sound override subclass'],
    VerifiedBuild: ['Версия сборки', 'Verified build'],
    requiredspell: ['Требуемое заклинание', 'Required spell'],
    RequiredCityRank: ['Ранг города', 'Required city rank'],
    requiredhonorrank: ['Ранг чести', 'Required honor rank'],
    RequiredReputationFaction: ['Требуемая репутация', 'Required reputation faction'],
    RequiredReputationRank: ['Ранг репутации', 'Required reputation rank'],
    maxMoneyLoot: ['Максимум денег в добыче', 'Max money loot'],
    sourceFile: ['Файл-источник (дамп)', 'Source file (dump)'],
    minMoneyLoot: ['Минимум денег в добыче', 'Min money loot'],
    FoodTypeId: ['Тип еды', 'Food type']
  };

  /* какие колонки базы не показываем в таблице параметров */
  var PARAM_SKIP = ['spellid_', 'spelltrigger_', 'spellcharges_', 'spellppmRate_', 'spellcooldown_',
    'spellcategory_', 'socketColor_', 'socketContent_', 'stat_type', 'stat_value', 'ScalingStat',
    'AllowableRace', 'AllowableClass', 'FlagsExtra', 'flagsCustom', 'VerifiedBuild', 'SoundOverrideSubclass'];

  function isParamSkipped(col) {
    for (var i = 0; i < PARAM_SKIP.length; i++) {
      if (col.indexOf(PARAM_SKIP[i]) === 0) return true;
    }
    return false;
  }

  /* ------------------------------- утилиты -------------------------------- */

  function pluralRu(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m100 >= 11 && m100 <= 14) return many;
    if (m10 === 1) return one;
    if (m10 >= 2 && m10 <= 4) return few;
    return many;
  }

  L.UI = UI;
  L.QUALITY = QUALITY;
  L.CLASS = CLASS;
  L.SUBCLASS = SUBCLASS;
  L.SLOT = SLOT;
  L.STAT = STAT;
  L.STAT_PHRASE = STAT_PHRASE;
  L.DAMAGE_TYPE = DAMAGE_TYPE;
  L.SOCKET = SOCKET;
  L.BONDING = BONDING;
  L.RESIST = RESIST;
  L.FLAGS = FLAGS;
  L.FLAGS_EXTRA = FLAGS_EXTRA;
  L.CLASS_MASK = CLASS_MASK;
  L.CLASS_MASK_EN = CLASS_MASK_EN;
  L.CLASS_BITS = CLASS_BITS;
  L.RACE_MASK = RACE_MASK;
  L.RACE_MASK_EN = RACE_MASK_EN;
  L.RACE_BITS = RACE_BITS;
  L.PARAM_DESC = PARAM_DESC;
  L.isParamSkipped = isParamSkipped;
  L.pluralRu = pluralRu;

  global.ArmoryI18n = L;
}(window));
