-- Reset catalog data in PostgreSQL for Render/production
-- Run this against the Render PostgreSQL database connected to the app.

BEGIN;

DELETE FROM coupons;
DELETE FROM games;
DELETE FROM companies;

INSERT INTO companies (slug, name_ar, name_en) VALUES
  ('activision', 'اكتفجن', 'Activision'),
  ('yalla-tech', 'يلا تكنولوجي', 'Yalla Technology'),
  ('battlefield', 'باتلفيلد', 'Battlefield');

INSERT INTO games (
  company_id,
  product_type,
  product_subtype,
  name_ar,
  name_en,
  genre,
  release_year,
  price,
  currency,
  cover_image_url,
  description
)
VALUES
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وورفير 3', 'Call of Duty: Modern Warfare III', 'Shooter', 2023, 179, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg', 'جزء جديد من سلسلة Call of Duty مع طور قصة وطور جماعي سريع.'),
  (1, 'game', NULL, 'كراش بانديكوت 4', 'Crash Bandicoot 4', 'Platform', 2020, 89, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1378990/header.jpg', 'لعبة منصات كلاسيكية سريعة بإيقاع ممتع وتحديات متتالية.'),
  (1, 'game', NULL, 'دايابلو 4', 'Diablo IV', 'Action RPG', 2023, 199, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg', 'تجربة اكشن RPG مظلمة مع عالم مفتوح وزعماء أقوياء.'),
  (1, 'game', NULL, 'كول اوف ديوتي (نداء الواجب)', 'Call of Duty', 'Shooter', 2003, 59, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2620/header.jpg', 'تدور أحداث اللعبة في الحرب العالمية الثانية عبر ثلاثة جنود مختلفين في جبهات كبيرة عبر أوروبا والشرق.'),
  (1, 'game', NULL, 'كول اوف ديوتي 2', 'Call of Duty 2', 'Shooter', 2005, 69, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2630/header.jpg', 'استكمال للجزء الأول مع تحسينات جرافيك كبيرة وتجربة حربية أفضل خلال معارك الحرب العالمية الثانية.'),
  (1, 'game', NULL, 'كول اوف ديوتي 3', 'Call of Duty 3', 'Shooter', 2006, 79, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2640/header.jpg', 'تركز القصة على معركة نورماندي وتحرير باريس عبر قوات التحالف المختلفة في حرب شاملة.'),
  (1, 'game', NULL, 'كول اوف ديوتي 4: المودرن وورفير', 'Call of Duty 4: Modern Warfare', 'Shooter', 2007, 89, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/7940/header.jpg', 'نقلة نوعية إلى الحروب الحديثة مع قصة عن الإرهاب الدولي وتجربة سريعة ومثيرة في القتال التكتيكي.'),
  (1, 'game', NULL, 'كول اوف ديوتي: وورلد أتم وور', 'Call of Duty: World at War', 'Shooter', 2008, 82, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/10090/header.jpg', 'عودة إلى الحرب العالمية الثانية بأسلوب أكثر سوداوية وواقعية مع معارك المحيط الهادئ وجبهة شرق أوروبا.'),
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وارفير 2', 'Call of Duty: Modern Warfare 2', 'Shooter', 2009, 96, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/10190/header.jpg', 'تدور القصة حول فرقة المهام 141 وتطور العداوة مع تنظيم إرهابي روسي يهدد بإشعال حرب عالمية.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس', 'Call of Duty: Black Ops', 'Shooter', 2010, 99, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/202970/header.jpg', 'تتبع قصة عمليات سرية في الحرب الباردة مع تناقضات تاريخية وتفاصيل غامضة وذكريات عسكرية.'),
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وارفير 3', 'Call of Duty: Modern Warfare 3', 'Shooter', 2011, 105, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/115300/header.jpg', 'الجزء الختامي لثلاثية Modern Warfare مع صراع عالمي بين الولايات المتحدة وروسيا ومطاردة ماكاروف.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس 2', 'Call of Duty: Black Ops II', 'Shooter', 2012, 109, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/202990/header.jpg', 'تجمع القصة بين الماضي والمستقبل مع خيارات متعددة ونهايات تعتمد على قرارات اللاعب.'),
  (1, 'game', NULL, 'كول اوف ديوتي: غوستس', 'Call of Duty: Ghosts', 'Shooter', 2013, 85, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/209160/header.jpg', 'تدور أحداثها في عالم مستقبلي بديل بعد تدمير أمريكا الشمالية مع فرقة سرية تعرف بالأشباح.'),
  (1, 'game', NULL, 'كول اوف ديوتي: أدفانسد وارفير', 'Call of Duty: Advanced Warfare', 'Shooter', 2014, 114, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/209160/header.jpg', 'تستفيد اللعبة من تقنيات المستقبل والهياكل الخارجية لإعطاء اللاعب قدرات قفز وسرعة غير عادية.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس 3', 'Call of Duty: Black Ops III', 'Shooter', 2015, 118, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/311210/header.jpg', 'تقع القصة في عام 2065 مع تزايد استخدام التكنولوجيا السيبرانية وإعادة صياغة طبيعة القتال.'),
  (1, 'game', NULL, 'كول اوف ديوتي: إنفنيت وارفير', 'Call of Duty: Infinite Warfare', 'Shooter', 2016, 99, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/292730/header.jpg', 'تستكشف الصراع في الفضاء وتحريك أحداث القصة داخل النظام الشمسي مع معارك بحرية وجوية واسعة.'),
  (1, 'game', NULL, 'كول اوف ديوتي: الحرب العالمية الثانية', 'Call of Duty: WWII', 'Shooter', 2017, 129, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/476600/header.jpg', 'عودة للجذور التاريخية للسلسلة مع قصة قريبة من الواقع حول إنزال نورماندي ومعارك أوروبا.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس 4', 'Call of Duty: Black Ops 4', 'Shooter', 2018, 119, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/489940/header.jpg', 'أول جزء يركز على طور اللعب الجماعي والباتل رويال وينتقل بعيدًا عن القصة التقليدية.'),
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وارفير', 'Call of Duty: Modern Warfare', 'Shooter', 2019, 149, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/header.jpg', 'إعادة تطوير للسلسلة بأسلوب واقعي أكثر مع قصة مثيرة وقصة عبر Warzone في العالم المدمج.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس كولد وور', 'Call of Duty: Black Ops Cold War', 'Shooter', 2020, 139, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1259420/header.jpg', 'تدور القصة خلال الثمانينيات في عالم التجسس والحرب الباردة مع شخصيات معروفة ومهام متقنة.'),
  (1, 'game', NULL, 'كول اوف ديوتي: فانغارد', 'Call of Duty: Vanguard', 'Shooter', 2021, 131, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1369760/header.jpg', 'تسرد قصة جيش الطليعة عبر جبهات الحرب العالمية الثانية المختلفة في أوروبا وأفريقيا والمحيط الهادئ.'),
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وارفير 2 (2022)', 'Call of Duty: Modern Warfare II', 'Shooter', 2022, 159, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/header.jpg', 'استمرار للأحداث في عالم Task Force 141 مع مهمات تكتيكية وعالم واسع ومغامرات عالمية.'),
  (1, 'game', NULL, 'كول اوف ديوتي: مودرن وارفير 3 (2023)', 'Call of Duty: Modern Warfare III', 'Shooter', 2023, 179, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg', 'سلسلة جديدة من المعارك العالمية ضد ماكاروف مع خرائط متعددة ووضع زومبي في العالم الحديث.'),
  (1, 'game', NULL, 'كول اوف ديوتي: بلاك أوبس 6', 'Call of Duty: Black Ops 6', 'Shooter', 2024, 189, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/2915960/header.jpg', 'تدور أحداث القصة في التسعينيات مع مؤامرات سياسية وتجسس داخلي وحركة جديدة في أسلوب القتال.'),
  (2, 'game', NULL, 'يلا لودو', 'Yalla Ludo', 'Board', 2018, 33, 'IQD', 'https://images.unsplash.com/photo-1606502713237-65a5a5ed2f4e?auto=format&fit=crop&w=800&q=80', 'لعبة اجتماعية أونلاين تعتمد على لودو والدردشة الصوتية.'),
  (2, 'game', NULL, 'يلا بالوت', 'Yalla Baloot', 'Card', 2021, 42, 'IQD', 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80', 'تجربة أوراق لعب خليجية تنافسية مع غرف أصدقاء.'),
  (3, 'game', NULL, 'باتلفيلد 1942', 'Battlefield 1942', 'Shooter', 2002, 59, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1659900/header.jpg', 'اللعبة التي أطلقت السلسلة وتدور أحداثها في الحرب العالمية الثانية مع أسلوب اللعب الجماعي القائم على الفئات والمركبات.'),
  (3, 'game', NULL, 'باتلفيلد فيتنام', 'Battlefield Vietnam', 'Shooter', 2004, 62, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1659300/header.jpg', 'تنتقل المعارك إلى حرب فيتنام مع جبهات غابات كثيفة وتعديلات كبيرة على القتال بالمروحيات والمركبات.'),
  (3, 'game', NULL, 'باتلفيلد 2', 'Battlefield 2', 'Shooter', 2005, 68, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/15320/header.jpg', 'نقلة نوعية للحروب الحديثة مع نظام القائد والكتائب والذكاء العسكري المتوازن داخل المعارك واسعة النطاق.'),
  (3, 'game', NULL, 'باتلفيلد 2142', 'Battlefield 2142', 'Shooter', 2006, 65, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/15130/header.jpg', 'تأخذ السلسلة إلى عصري المستقبل القريب في حرب كوكبية بين القوى الكبرى باستخدام مركبات وألات ميكانيكية متقدمة.'),
  (3, 'game', NULL, 'باتلفيلد: باد كومباني', 'Battlefield: Bad Company', 'Shooter', 2008, 74, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/15100/header.jpg', 'ركزت القصة على سرية من الجنود المتمردين وقدمت محرك Frostbite المميز للتدمير البيئي الشامل.'),
  (3, 'game', NULL, 'باتلفيلد 1943', 'Battlefield 1943', 'Shooter', 2009, 52, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238840/header.jpg', 'لعبة جماعية أونلاين فقط تعود إلى قتال المحيط الهادئ في الحرب العالمية الثانية مع سلاسة وتوازن واضح.'),
  (3, 'game', NULL, 'باتلفيلد: باد كومباني 2', 'Battlefield: Bad Company 2', 'Shooter', 2010, 79, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/200130/header.jpg', 'واحدة من أفضل أجزاء السلسلة؛ جلبت قصة ممتعة وتدميرًا بيئيًا كاملًا مع توازن ممتاز في التفاعل الجماعي.'),
  (3, 'game', NULL, 'باتلفيلد 3', 'Battlefield 3', 'Shooter', 2011, 94, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238840/header.jpg', 'إنجاز تقني كبير في الرسوم والمعارك الحديثة، وتطرق إلى الحرب في الشرق الأوسط وأوروبا مع أعداد كبيرة من اللاعبين.'),
  (3, 'game', NULL, 'باتلفيلد 4', 'Battlefield 4', 'Shooter', 2013, 99, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg', 'نقطة تحول في السلسلة بفضل ميزة Levolution التي تسمح بتغيير الخريطة بشكل ديناميكي أثناء المعركة.'),
  (3, 'game', NULL, 'باتلفيلد هارد لاين', 'Battlefield Hardline', 'Shooter', 2015, 88, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg', 'التخلي عن الحروب العسكرية إلى صراع بين الشرطة والمجرمين مع مطاردات وسرقة بنوك ومعارك عنيفة وواقعية.'),
  (3, 'game', NULL, 'باتلفيلد 1', 'Battlefield 1', 'Shooter', 2016, 110, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg', 'تجاوزت السلسلة عصر الحرب العالمية الأولى بخلفية إنسانية وعسكرية مفعمة بالدموع والبطولة والجو المميز.'),
  (3, 'game', NULL, 'باتلفيلد 5', 'Battlefield V', 'Shooter', 2018, 109, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238820/header.jpg', 'عودة للحرب العالمية الثانية مع التركيز على الجبهات الأقل شهرة وتعديلات على أسلوب البناء والتحصين.'),
  (3, 'game', NULL, 'باتلفيلد 2042', 'Battlefield 2042', 'Shooter', 2021, 119, 'IQD', 'https://cdn.cloudflare.steamstatic.com/steam/apps/1517290/header.jpg', 'تدور في مستقبل قريب بعد الكوارث المناخية وتفكك الدول، مع خرائط ضخمة تصل لـ 128 لاعبًا وتركيز كامل على المباريات الجماعية.');

COMMIT;
