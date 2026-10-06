export const messages = {
 language:['Language','Язык'], filters:['Filters','Фильтры'], about:['About the data ↗','О данных ↗'], edition:['GLOBAL TERRORISM DATABASE','GLOBAL TERRORISM DATABASE'],
 skip:['Skip to event list','Перейти к списку событий'], heading:['Explore the Global Terrorism Database','Исследуйте Global Terrorism Database'],
 events:['Events','События'], fatalities:['Fatalities','Погибшие'], injuries:['Injuries','Раненые'], knownFatalities:['Known fatalities','Погибшие (известно)'], knownInjuries:['Known injuries','Раненые (известно)'],
 noData:['No data','Нет данных'], fit:['Fit events ⤢','Показать события ⤢'], zero:['Zero','Ноль'], unknown:['No known values','Значения неизвестны'],
 legendScale:['Area = known total · scale adjusts to map view','Площадь = известная сумма · масштаб зависит от вида карты'],
 legendFloor:['Minimum size for small values · counts include attackers','Малые значения имеют минимальный размер · включая нападавших'],
 period:['TIME WINDOW','ПЕРИОД'], showEvents:['Explore events ↑','Список событий ↑'], from:['From','С'], to:['To','По'], startYear:['Start year','Начальный год'], endYear:['End year','Конечный год'],
 methodology:['Methodology ↗','Методология ↗'], explore:['EXPLORE THE RECORD','ИССЛЕДУЙТЕ ДАННЫЕ'], places:['Places & years','Страны и годы'], reset:['Reset','Сбросить'],
 countries:['Countries','Страны'], all:['All','Все'], allCountries:['All countries','Все страны'], selected:['{n} selected','Выбрано: {n}'], search:['Search countries','Поиск стран'], noCountries:['No matching countries.','Страны не найдены.'],
 behind:['BEHIND EVERY POINT','ЗА КАЖДОЙ ТОЧКОЙ'], eventList:['Explore the events','Список событий'], date:['Date','Дата'], location:['Location','Место'], country:['Country','Страна'], record:['Record','Запись'],
 previous:['← Previous','← Назад'], next:['Next →','Далее →'], closeList:['Close event list','Закрыть список событий'], closeInfo:['Close information','Закрыть информацию'], closeEvent:['Close event details','Закрыть карточку события'],
 mapResults:['Map and results','Карта и результаты'], eventFilters:['Event filters','Фильтры событий'], measure:['Bubble size measure','Показатель размера пузырьков'], filteredList:['Filtered event list','Список отфильтрованных событий'], listPages:['Event list pages','Страницы списка событий'],
 tableCaption:['Filtered events. Select a location to view details.','Отфильтрованные события. Выберите место, чтобы открыть карточку.'],
 noEvents:['No events found','События не найдены'], tryFilters:['Try another period or country selection.','Выберите другой период или страну.'], noCoverage:['No coverage','Нет покрытия'],
 gapLabel:['1993: no event-level coverage','1993: записи событий отсутствуют'], partialLabel:['2021: January–June only','2021: только январь–июнь'], gapRecords:['1993 records are unavailable','Записи за 1993 год недоступны'],
 unmapped:['Without coordinates: {n}','Без координат: {n}'], knownSum:['Sum of known values · unknown: {n}','Сумма известных · нет данных: {n}'],
 gapTitle:['No event-level coverage for 1993','Записи событий за 1993 год отсутствуют'], gapNote:['GTD records for this year are unavailable. This does not mean no attacks occurred.','Записи GTD за этот год недоступны. Это не означает, что терактов не было.'],
 unavailableYear:['Year unavailable','Год недоступен'], listCount:['Events: {n}','Событий: {n}'], demoListCount:['Fictional events: {n}','Вымышленных событий: {n}'], page:['Page {page} of {pages}','Страница {page} из {pages}'],
 loadingMap:['Loading map…','Загрузка карты…'], loadingResults:['Loading filtered results…','Загрузка результатов…'], loadingData:['Loading dataset…','Загрузка данных…'], loadingCoverage:['Loading coverage…','Загрузка покрытия…'], loadingRecords:['Loading records…','Загрузка записей…'], loadingSelection:['Loading selection…','Загрузка выборки…'],
 demoStatus:['Demonstration dataset · fictional records','Демонстрационный набор · вымышленные записи'], localStatus:['Local GTD dataset · filters apply to the full selection','Локальный набор GTD · итоги по всей выборке'],
 resultsError:['Could not load results: {error}. Change a filter or use Reset to retry.','Не удалось загрузить результаты: {error}. Измените фильтр или нажмите «Сбросить».'], resultsUnavailable:['Results unavailable','Результаты недоступны'],
 requestError:['Request failed ({status})','Ошибка запроса ({status})'], loadingEvents:['Loading events…','Загрузка событий…'], groupError:['Could not load this group: {error}','Не удалось загрузить группу: {error}'],
 viewEvent:['View event {id} in {city}','Открыть событие {id}: {city}'], viewDemoEvent:['View fictional event {id} in {city}','Открыть вымышленное событие {id}: {city}'],
 cityUnknown:['Unknown','Неизвестное место'], syntheticPoint:['Illustrative settlement coordinates, not an actual attack location.','Условные координаты населённого пункта, а не место реального теракта.'],
 precision1:['Coordinates identify the city, village, or town, generally its centroid.','Координаты обозначают населённый пункт, как правило его центр.'],
 precision2:['Coordinates identify the centroid of the smallest known subnational region; settlement coordinates were unavailable.','Координаты обозначают центр наименьшей известной административной территории; координаты населённого пункта недоступны.'],
 precision3:['The event was outside a settlement. Coordinates identify the centroid of the smallest known subnational region.','Событие произошло вне населённого пункта. Координаты обозначают центр наименьшей известной административной территории.'],
 precision4:['Coordinates identify the center of a first-order administrative region.','Координаты обозначают центр административного региона первого уровня.'],
 precision5:['GTD could not identify a first-order region; coordinates are unknown.','GTD не удалось определить административный регион первого уровня; координаты неизвестны.'],
 precisionUnknown:['Coordinate precision is not recorded. Do not interpret this point as an exact attack site.','Точность координат не указана. Точка не обозначает точное место теракта.'],
 noCoordinates:['No usable coordinates. This record remains in the event list and summary.','Подходящих координат нет. Запись остаётся в списке событий и общей статистике.'],
 fictionalBadge:['FICTIONAL EVENT','ВЫМЫШЛЕННОЕ СОБЫТИЕ'], gtdBadge:['GTD RECORD','ЗАПИСЬ GTD'], happened:['What happened','Что произошло'],
 demoDescription:['Description unavailable for this fictional fixture.','Описание для этого вымышленного примера отсутствует.'], loadingDescription:['Loading description…','Загрузка описания…'],
 approximateDate:['Approximate date information from GTD: {date}','Информация GTD о приблизительной дате: {date}'],
 syntheticNote:['Synthetic record for testing only.','Вымышленная запись только для тестирования.'], countsNote:['Fatalities and injuries include attackers. Classification and counts follow GTD.','Погибшие и раненые включают нападавших. Классификация и численность приведены по GTD.'],
 gtdDescription:['Description from GTD','Описание GTD · оригинал на английском'], fieldsDescription:['Description based on GTD fields','Описание на основе полей GTD'], descriptionUnavailable:['Description unavailable','Описание отсутствует'],
 noDescriptionCountry:['Descriptions have not yet been imported for this country.','Описания для этой страны пока не импортированы.'], importDescriptions:['Re-run the local import to load descriptions.','Повторите локальный импорт, чтобы загрузить описания.'],
 readFull:['Read full description','Полное описание'], showLess:['Show less','Свернуть'], sources:['Sources · {n}','Источники · {n}'], openSource:['Open source ↗','Открыть источник ↗'],
 noSources:['No source citation is recorded for this event.','Для этого события источник не указан.'], descriptionError:['Could not load the description.','Не удалось загрузить описание.'], retry:['Retry','Повторить'],
 groupCount:['Grouped events: {n}','Событий в группе: {n}'], demoGroupCount:['Grouped fictional events: {n}','Вымышленных событий в группе: {n}'],
 groupNote:['Grouped by map proximity. Counts include attackers.','События сгруппированы по близости на карте. Численность включает нападавших.'],
 groupSummary:['Known fatalities: {fatalities} · unknown records: {fu}. Known injuries: {injuries} · unknown records: {iu}.','Погибшие (известно): {fatalities} · записей без данных: {fu}. Раненые (известно): {injuries} · записей без данных: {iu}.'],
 noPositive:['No positive known totals','Нет положительных известных значений'], noMapped:['No mapped events','Нет событий с координатами'],
 tooltipMetric:['{value} known {metric} · unknown records: {n}','{metric} (известно): {value} · записей без данных: {n}'],
 mapEventsError:['Could not load map events: {error}. The event list remains available.','Не удалось загрузить события на карте: {error}. Список событий доступен.'],
 tileError:['Some map tiles could not load. Filters and the event list remain available.','Часть карты не загрузилась. Фильтры и список событий доступны.'],
 mapUnavailable:['Map unavailable. Check your connection or explore the event list below.','Карта недоступна. Проверьте подключение или откройте список событий.'],
 fitError:['Could not fit events: {error}','Не удалось показать события: {error}'], zoomIn:['Zoom in','Приблизить'], zoomOut:['Zoom out','Отдалить'],
 demoTitle:['GTD Explorer · Demonstration','GTD Explorer · Демонстрация'], demoBadge:['DEMONSTRATION','ДЕМОНСТРАЦИЯ'], demoHeading:['Fictional events. Real interactions.','Вымышленные события. Работающий интерфейс.'],
 demoExplanation:['No GTD records in this mode. Locations and counts are synthetic examples.','В этом режиме нет записей GTD. Места и численность — вымышленные примеры.'], demoCoverage:['Demo coverage: 2014–2023','Демонстрация: 2014–2023'],
 demoRecords:['24 fictional records · 16 countries','24 вымышленные записи · 16 стран'], demoSource:['Synthetic dataset · Counts include all people in each example','Вымышленный набор · учтены все люди в каждом примере'], demoMap:['Interactive map of fictional events','Интерактивная карта вымышленных событий'],
 localTitle:['GTD Explorer · Local dataset','GTD Explorer · Локальные данные'], localBadge:['LOCAL GTD DATA','ЛОКАЛЬНЫЕ ДАННЫЕ GTD'], localHeading:['Historical records. In context.','Исторические записи в контексте.'],
 localExplanation:['1970–2020 + January–June 2021. Includes a coverage gap for 1993.','1970–2020 и январь–июнь 2021. Записи за 1993 год отсутствуют.'],
 localCoverage:['GTD coverage: 1970–Jun 2021','Покрытие GTD: 1970 — июнь 2021'], localRecords:['{records} records · {countries} country codes','Записей: {records} · кодов стран: {countries}'],
 localMap:['Interactive map of GTD events','Интерактивная карта событий GTD'], localSource:['Source: START / University of Maryland · Counts include attackers','Источник: START / University of Maryland · включая нападавших'], localEdition:['/ Local dataset','/ Локальные данные'],
 sourceContext:['SOURCE & CONTEXT','ИСТОЧНИК И КОНТЕКСТ'], datasetInfo:['About this dataset','Об этом наборе данных'],
 datasetIntro:['{n} GTD records from the May 2022 main release and the December 2022 January–June 2021 supplement. Original files are kept unchanged, and only fields needed for this explorer are imported.','Записей GTD: {n}. Основной выпуск — май 2022, дополнение за январь–июнь 2021 — декабрь 2022. Исходные файлы не изменяются; импортируются только необходимые сервису поля.'],
 coverageInfo:['Coverage and missing values','Покрытие и пропуски'],
 coverageText:['The main data covers 1970–2020, excluding 1993. The 2021 supplement covers January–June only; it is not a complete year. Differences in data collection methods affect comparisons over time.','Основные данные охватывают 1970–2020, кроме 1993 года. Дополнение за 2021 год содержит только январь–июнь. Различия в методах сбора данных влияют на сравнения между годами.'],
 missingText:['{n} records lack coordinates. They remain in summaries and the event list. Blank fatality and injury values stay unknown; totals sum known values and display unknown counts. These measures include attackers.','Без координат: {n} записей. Они остаются в статистике и списке событий. Пропуски в численности погибших и раненых остаются неизвестными: итоги суммируют известные значения и отдельно показывают число пропусков. Численность включает нападавших.'],
 bubbleMethod:['Coordinates may identify settlement or administrative-region centroids. Marker locations are not necessarily exact attack sites. Bubble area represents the selected sum of known fatalities or injuries, including attackers. Groups aggregate nearby events. The scale adjusts to the map view; use the legend and tooltips to compare values. Small positive totals have a minimum visible radius. Hollow circles show zero; dashed circles show entirely unknown totals. Map movement changes visible groups but does not change filtered totals.','Координаты могут обозначать центр населённого пункта или региона, а не точное место теракта. Площадь круга отражает сумму известных погибших или раненых, включая нападавших. Близкие события объединяются в группы. Масштаб зависит от вида карты; для сравнения используйте легенду и подсказки. Малые положительные значения имеют минимальный видимый радиус. Пустые круги обозначают ноль, пунктирные — полностью неизвестные значения. Перемещение карты меняет видимые группы, но не итоги выборки.'],
 sourceUsage:['Source and usage','Источник и использование'], sourceLink:['GTD source and methodology ↗','Источник GTD и методология ↗'],
 usageText:['Copyright University of Maryland 2022. This local explorer is for non-commercial research and analysis. GTD files and the local database are not included in the public repository. Classification follows GTD.','Copyright University of Maryland 2022. Локальный сервис предназначен для некоммерческого исследования и анализа. Файлы GTD и локальная база отсутствуют в публичном репозитории. Классификация соответствует GTD.'],
 sourceDescriptionNote:['Descriptions from GTD remain in their original language. Structured descriptions use recorded fields; no external research or AI-generated event claims are added.','Описания GTD сохраняются на языке оригинала. Описания из полей используют только сведения записи: внешний поиск и выдуманные утверждения не добавляются. Названия мест, целей и библиографические ссылки сохраняются как в источнике.'],
 unavailableBadge:['DATA UNAVAILABLE','ДАННЫЕ НЕДОСТУПНЫ'], startServer:['Start the local explorer server','Запустите локальный сервер'], startHelp:['The dataset could not be loaded. Follow the local startup instructions in README.','Набор данных не загрузился. Инструкция по локальному запуску приведена в README.'], datasetError:['Dataset unavailable: {error}','Данные недоступны: {error}'],
 noCoverageOption:[' — no coverage',' — нет покрытия'], partialOption:[' — Jan–Jun',' — янв.–июнь'], gapRange:['1993: no coverage','1993: нет покрытия'], demoRange:['Fictional records','Вымышленные записи'],
 demoInfo:['Demonstration dataset','Демонстрационные данные'], demoInfoText:['All 24 events are fictional fixtures, separate from GTD records.','Все 24 события вымышлены и не смешиваются с записями GTD.'],
 noScript:['Enable JavaScript to use filters and the event list.','Включите JavaScript для работы фильтров и списка событий.'],
 fieldLocation:['GTD records this event in {place}.','По данным GTD, событие произошло в {place}.'],
 fieldAttack:['Attack type recorded by GTD: {type}.','Тип атаки по GTD: {type}.'], fieldTarget:['Target recorded by GTD: {target}.','Цель по GTD: {target}.'],
 fieldCount:['{metric} reported by GTD: {n}.','{metric} по GTD: {n}.'], fieldUnknown:['{metric} are not recorded.','{metric}: нет данных.']
};
export let language='ru';
export function setLanguage(value){language=value==='en'?'en':'ru';}
export function t(key,values={},locale=language){
 const pair=messages[key];if(!pair)throw new Error('Unknown translation key: '+key);
 return pair[locale==='en'?0:1].replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??'{'+name+'}'));
}
export const countryNames = Object.fromEntries(`
Afghanistan|Афганистан
Albania|Албания
Algeria|Алжир
Andorra|Андорра
Angola|Ангола
Antigua and Barbuda|Антигуа и Барбуда
Argentina|Аргентина
Armenia|Армения
Australia|Австралия
Austria|Австрия
Azerbaijan|Азербайджан
Bahamas|Багамы
Bahrain|Бахрейн
Bangladesh|Бангладеш
Barbados|Барбадос
Belarus|Беларусь
Belgium|Бельгия
Belize|Белиз
Benin|Бенин
Bhutan|Бутан
Bolivia|Боливия
Bosnia-Herzegovina|Босния и Герцеговина
Botswana|Ботсвана
Brazil|Бразилия
Brunei|Бруней
Bulgaria|Болгария
Burkina Faso|Буркина-Фасо
Burundi|Бурунди
Cambodia|Камбоджа
Cameroon|Камерун
Canada|Канада
Central African Republic|Центральноафриканская Республика
Chad|Чад
Chile|Чили
China|Китай
Colombia|Колумбия
Comoros|Коморы
Costa Rica|Коста-Рика
Croatia|Хорватия
Cuba|Куба
Cyprus|Кипр
Czech Republic|Чехия
Czechoslovakia|Чехословакия
Democratic Republic of the Congo|Демократическая Республика Конго
Denmark|Дания
Djibouti|Джибути
Dominica|Доминика
Dominican Republic|Доминиканская Республика
East Germany (GDR)|ГДР
East Timor|Восточный Тимор
Ecuador|Эквадор
Egypt|Египет
El Salvador|Сальвадор
Equatorial Guinea|Экваториальная Гвинея
Eritrea|Эритрея
Estonia|Эстония
Ethiopia|Эфиопия
Falkland Islands|Фолклендские острова
Fiji|Фиджи
Finland|Финляндия
France|Франция
French Guiana|Французская Гвиана
French Polynesia|Французская Полинезия
Gabon|Габон
Gambia|Гамбия
Georgia|Грузия
Germany|Германия
Ghana|Гана
Greece|Греция
Grenada|Гренада
Guadeloupe|Гваделупа
Guatemala|Гватемала
Guinea|Гвинея
Guinea-Bissau|Гвинея-Бисау
Guyana|Гайана
Haiti|Гаити
Honduras|Гондурас
Hong Kong|Гонконг
Hungary|Венгрия
Iceland|Исландия
India|Индия
Indonesia|Индонезия
International|Международное
Iran|Иран
Iraq|Ирак
Ireland|Ирландия
Israel|Израиль
Italy|Италия
Ivory Coast|Кот-д’Ивуар
Jamaica|Ямайка
Japan|Япония
Jordan|Иордания
Kazakhstan|Казахстан
Kenya|Кения
Kosovo|Косово
Kuwait|Кувейт
Kyrgyzstan|Кыргызстан
Laos|Лаос
Latvia|Латвия
Lebanon|Ливан
Lesotho|Лесото
Liberia|Либерия
Libya|Ливия
Lithuania|Литва
Luxembourg|Люксембург
Macau|Макао
Macedonia|Македония
Madagascar|Мадагаскар
Malawi|Малави
Malaysia|Малайзия
Maldives|Мальдивы
Mali|Мали
Malta|Мальта
Martinique|Мартиника
Mauritania|Мавритания
Mauritius|Маврикий
Mexico|Мексика
Moldova|Молдова
Montenegro|Черногория
Morocco|Марокко
Mozambique|Мозамбик
Myanmar|Мьянма
Namibia|Намибия
Nepal|Непал
Netherlands|Нидерланды
New Caledonia|Новая Каледония
New Hebrides|Новые Гебриды
New Zealand|Новая Зеландия
Nicaragua|Никарагуа
Niger|Нигер
Nigeria|Нигерия
North Korea|Северная Корея
North Yemen|Северный Йемен
Norway|Норвегия
Pakistan|Пакистан
Panama|Панама
Papua New Guinea|Папуа — Новая Гвинея
Paraguay|Парагвай
People's Republic of the Congo|Народная Республика Конго
Peru|Перу
Philippines|Филиппины
Poland|Польша
Portugal|Португалия
Qatar|Катар
Republic of the Congo|Республика Конго
Rhodesia|Родезия
Romania|Румыния
Russia|Россия
Rwanda|Руанда
Saudi Arabia|Саудовская Аравия
Senegal|Сенегал
Serbia|Сербия
Serbia-Montenegro|Сербия и Черногория
Seychelles|Сейшелы
Sierra Leone|Сьерра-Леоне
Singapore|Сингапур
Slovak Republic|Словакия
Slovenia|Словения
Solomon Islands|Соломоновы Острова
Somalia|Сомали
South Africa|ЮАР
South Korea|Южная Корея
South Sudan|Южный Судан
South Yemen|Южный Йемен
Soviet Union|СССР
Spain|Испания
Sri Lanka|Шри-Ланка
St. Kitts and Nevis|Сент-Китс и Невис
St. Lucia|Сент-Люсия
Sudan|Судан
Suriname|Суринам
Swaziland|Свазиленд
Sweden|Швеция
Switzerland|Швейцария
Syria|Сирия
Taiwan|Тайвань
Tajikistan|Таджикистан
Tanzania|Танзания
Thailand|Таиланд
Togo|Того
Trinidad and Tobago|Тринидад и Тобаго
Tunisia|Тунис
Turkey|Турция
Turkmenistan|Туркменистан
Uganda|Уганда
Ukraine|Украина
United Arab Emirates|ОАЭ
United Kingdom|Великобритания
United States|США
Uruguay|Уругвай
Uzbekistan|Узбекистан
Vanuatu|Вануату
Vatican City|Ватикан
Venezuela|Венесуэла
Vietnam|Вьетнам
Wallis and Futuna|Уоллис и Футуна
West Bank and Gaza Strip|Западный берег и сектор Газа
West Germany (FRG)|ФРГ
Western Sahara|Западная Сахара
Yemen|Йемен
Yugoslavia|Югославия
Zaire|Заир
Zambia|Замбия
Zimbabwe|Зимбабве
`.trim().split('\n').map(row=>row.split('|')));
export function countryLabel(name,locale=language){return locale==='ru'?countryNames[name]||name:name;}
export function cityLabel(name,locale=language){return !name||name==='Unknown'?t('cityUnknown',{},locale):name;}
const attackNames={'Assassination':'Убийство','Armed Assault':'Вооружённое нападение','Bombing/Explosion':'Взрыв / взрывное устройство','Hijacking':'Угон / захват транспорта','Hostage Taking (Barricade Incident)':'Захват заложников с удержанием','Hostage Taking (Kidnapping)':'Похищение','Facility/Infrastructure Attack':'Атака на объект или инфраструктуру','Unarmed Assault':'Нападение без оружия','Unknown':'Неизвестно'};
export function fieldDescription(event,fields,locale=language){
 const place=event.city&&event.city!=='Unknown'?`${event.city}, ${countryLabel(event.country,locale)}`:countryLabel(event.country,locale);
 const facts=[t('fieldLocation',{place},locale)];
 if(fields.attack_type)facts.push(t('fieldAttack',{type:locale==='ru'?attackNames[fields.attack_type]||fields.attack_type:fields.attack_type},locale));
 if(fields.target)facts.push(t('fieldTarget',{target:fields.target},locale));
 for(const key of ['fatalities','injuries'])facts.push(t(event[key]===null?'fieldUnknown':'fieldCount',{metric:t(key,{},locale),n:event[key]?.toLocaleString(locale)},locale));
 return facts.join(' ');
}
