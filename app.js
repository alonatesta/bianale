(() => {
  'use strict';

  // סדר הקטגוריות וכמות העובדות/דימויים בכל אחת — תואם לסדר ולכמות הריבועים במסך הבית
  const CATEGORIES = [
    { key: 'פרטיות',   count: 4 },
    { key: 'ניוון',     count: 4 },
    { key: 'יצירתיות', count: 5 },
    { key: 'תעסוקה',   count: 5 },
    { key: 'אמינות',   count: 5 },
  ];

  // בקטגוריית "יצירתיות" קובצי הדימוי בתיקיית png נקראים "איור" ולא "דימוי"
  const IMAGE_LABEL_OVERRIDES = {
    'יצירתיות': 'איור',
  };

  function imagePath(category, type, index) {
    const label = type === 'דימוי' ? (IMAGE_LABEL_OVERRIDES[category] || 'דימוי') : 'עובדה';
    return `png/${category} ${label} ${index}.jpg`;
  }

  // --- מיקומי הריבועים במסך הבית (יחסית לתמונה 390x3496) ---
  // כל ריבוע ממוקם בעמודה שמאלית (5%–49%) או ימנית (51%–95%), בשורה לפי הקטגוריה.
  // בקטגוריות עם מספר אי-זוגי של פריטים, הפריט האחרון מופיע בעמודה הימנית בשורה נפרדת,
  // והעמודה השמאלית באותה שורה נשארת ריקה.
  const HOME_LAYOUT = {
    rowHeightPct: 6.5,
    colLeft:  { left: 5,  width: 44 },
    colRight: { left: 51, width: 44 },
    categoryRowTops: {
      'פרטיות':   [2.7, 9.3],
      'ניוון':     [17.3, 23.9],
      'יצירתיות': [31.9, 38.5, 45.1],
      'תעסוקה':   [53.1, 59.7, 66.4],
      'אמינות':   [74.5, 81.0, 87.7],
    },
  };

  function homeCardSlots(count) {
    // מחזיר רשימת {index, row, col} לפי כמות הפריטים בקטגוריה
    const slots = [];
    let idx = 1;
    let row = 0;
    while (idx <= count) {
      const remaining = count - idx + 1;
      // RTL: ימין = הפריט הראשון, שמאל = השני, שורה הבאה ימין = שלישי, וכן הלאה
      if (remaining === 1) {
        slots.push({ index: idx, row, col: 'right' });
        idx += 1;
      } else {
        slots.push({ index: idx, row, col: 'right' });
        slots.push({ index: idx + 1, row, col: 'left' });
        idx += 2;
      }
      row += 1;
    }
    return slots;
  }

  // --- מצב נוכחי ---
  let current = { category: null, index: null };

  // --- אלמנטים ---
  const screens = {
    home: document.getElementById('screen-home'),
    fact: document.getElementById('screen-fact'),
    image: document.getElementById('screen-image'),
  };
  const factImage = document.getElementById('fact-image');
  const imageImage = document.getElementById('image-image');
  const homeOverlay = document.getElementById('home-overlay');
  const shareMenu = document.getElementById('share-menu');
  const frameWrap = document.getElementById('frame-screens');
  const flipCard = document.getElementById('flip-card');
  const frontFace = flipCard.querySelector('.flip-front');
  const backFace = flipCard.querySelector('.flip-back');
  const cardCover = document.getElementById('card-cover');

  function srcOf(name) {
    return (name === 'fact' ? factImage : imageImage).src;
  }

  // הצגה ישירה (ללא היפוך): מסך הבית או אחד ממסכי הפריים
  function showHome() {
    screens.home.classList.add('is-active');
    frameWrap.classList.remove('is-shown');
    window.scrollTo(0, 0);
  }

  function showFrame(name) {
    screens.home.classList.remove('is-active');
    frameWrap.classList.add('is-shown');
    screens.fact.style.display = name === 'fact' ? 'block' : 'none';
    screens.image.style.display = name === 'image' ? 'block' : 'none';
    screens.fact.style.opacity = '';
    screens.image.style.opacity = '';
    window.scrollTo(0, 0);
  }

  function goHome() {
    closeShareMenu();
    showHome();
  }

  function openFact(category, index) {
    current = { category, index };
    factImage.src = imagePath(category, 'עובדה', index);
    factImage.alt = `${category} עובדה ${index}`;
    showFrame('fact');
  }

  // היפוך כרטיס תלת-ממדי אמיתי: חזית = הכרטיס הנוכחי, גב = כרטיס היעד.
  // הסיבוב רציף (0→180°), כיסוי לבן מסתיר את הכרטיס המוטבע ברקע כך שלא רואים
  // את הכרטיס שמאחור, וכל מה שמסביב (כפתורים) עובר בחפיפת opacity חלקה.
  let flipping = false;

  function flipTo(fromName, toName) {
    if (flipping) return;
    flipping = true;
    const fromEl = screens[fromName];
    const toEl = screens[toName];
    const fromSrc = srcOf(fromName);
    const toSrc = srcOf(toName);

    // טעינה מוקדמת של תמונת היעד כדי שגב הכרטיס לא יופיע ריק
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      frontFace.style.backgroundImage = `url("${fromSrc}")`;
      backFace.style.backgroundImage = `url("${toSrc}")`;

      // שני המסכים גלויים יחד לצורך החפיפה
      fromEl.style.display = 'block';
      toEl.style.display = 'block';
      fromEl.style.opacity = '1';
      toEl.style.opacity = '0';

      cardCover.style.display = 'block';
      flipCard.classList.remove('flipping');
      flipCard.style.display = 'block';
      void flipCard.offsetWidth; // reflow לאיתחול האנימציה והחפיפה

      flipCard.classList.add('flipping');
      toEl.style.opacity = '1';
      fromEl.style.opacity = '0';

      const onEnd = () => {
        flipCard.removeEventListener('animationend', onEnd);
        flipCard.classList.remove('flipping');
        flipCard.style.display = 'none';
        cardCover.style.display = 'none';
        // קיבוע מצב סופי: רק מסך היעד מוצג
        fromEl.style.display = 'none';
        fromEl.style.opacity = '';
        toEl.style.opacity = '';
        flipping = false;
      };
      flipCard.addEventListener('animationend', onEnd);
    };
    pre.src = toSrc;
  }

  function openImage() {
    if (!current.category) return;
    imageImage.src = imagePath(current.category, 'דימוי', current.index);
    imageImage.alt = `${current.category} דימוי ${current.index}`;
    flipTo('fact', 'image');
  }

  function backToFact() {
    closeShareMenu();
    flipTo('image', 'fact');
  }

  // --- בניית הריבועים השקופים על מסך הבית ---
  function buildHomeOverlay() {
    const frag = document.createDocumentFragment();
    CATEGORIES.forEach(({ key, count }) => {
      const rowTops = HOME_LAYOUT.categoryRowTops[key];
      homeCardSlots(count).forEach(({ index, row, col }) => {
        const colLayout = col === 'left' ? HOME_LAYOUT.colLeft : HOME_LAYOUT.colRight;
        const btn = document.createElement('button');
        btn.className = 'hot home-card';
        btn.style.left = `${colLayout.left}%`;
        btn.style.width = `${colLayout.width}%`;
        btn.style.top = `${rowTops[row]}%`;
        btn.style.height = `${HOME_LAYOUT.rowHeightPct}%`;
        btn.setAttribute('aria-label', `${key} עובדה ${index}`);
        btn.addEventListener('click', () => openFact(key, index));
        frag.appendChild(btn);
      });
    });
    homeOverlay.appendChild(frag);
  }

  // --- תפריט שיתוף ---
  function openShareMenu() {
    shareMenu.hidden = false;
  }
  function closeShareMenu() {
    shareMenu.hidden = true;
  }

  // מרכיב תמונה לשיתוף/שמירה: רק הלוגו העליון + הכרטיס (הדימוי), על רקע לבן.
  // שני האזורים נחתכים מתוך תמונת הדימוי המלאה (390x733) שכבר כוללת אותם.
  const COMPOSE = {
    frameW: 390,
    logo: { sx: 110, sy: 9, sw: 170, sh: 46 },   // הלוגו האדום במרכז (ללא החץ)
    card: { sx: 42, sy: 117, sw: 315, sh: 414 },  // מלבן הכרטיס המרכזי
    pad: 28,
    gap: 22,
  };

  function composeCardImage() {
    return new Promise((resolve, reject) => {
      const { frameW, logo, card, pad, gap } = COMPOSE;
      const img = new Image();
      img.onload = () => {
        // הקואורדינטות מוגדרות במרחב 390x733; התמונות בפועל עשויות להיות
        // ברזולוציה גבוהה יותר (למשל 1560x2932). מתאימים את החיתוך לפי הגודל האמיתי.
        const s = (img.naturalWidth || frameW) / frameW;
        const sc = (r) => ({ sx: r.sx * s, sy: r.sy * s, sw: r.sw * s, sh: r.sh * s });
        const L = sc(logo);
        const C = sc(card);
        const P = pad * s;
        const G = gap * s;
        const W = frameW * s;
        const H = P + L.sh + G + C.sh + P;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, L.sx, L.sy, L.sw, L.sh, (W - L.sw) / 2, P, L.sw, L.sh);
        ctx.drawImage(img, C.sx, C.sy, C.sw, C.sh, (W - C.sw) / 2, P + L.sh + G, C.sw, C.sh);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92);
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = imageImage.src;
    });
  }

  function currentShareName() {
    return `${current.category} דימוי ${current.index}.jpg`;
  }

  async function doShare() {
    try {
      const blob = await composeCardImage();
      const file = new File([blob], currentShareName(), { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'דוט טו דוט' });
        closeShareMenu();
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'דוט טו דוט', text: imageImage.alt, url: window.location.href });
        closeShareMenu();
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return; // המשתמש ביטל את השיתוף
      }
    }
    alert('שיתוף אינו נתמך בדפדפן זה. ניתן להשתמש באפשרות "שמור לטלפון".');
  }

  async function doSave() {
    try {
      const blob = await composeCardImage();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentShareName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('השמירה נכשלה. נסה שוב.');
    }
    closeShareMenu();
  }

  // --- האזנה לפעולות (event delegation לפי data-action) ---
  document.getElementById('app').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    switch (action) {
      case 'go-home': goHome(); break;
      case 'discover-image': openImage(); break;
      case 'back-to-fact': backToFact(); break;
      case 'open-share': openShareMenu(); break;
      case 'close-share': closeShareMenu(); break;
      case 'do-share': doShare(); break;
      case 'do-save': doSave(); break;
    }
  });

  buildHomeOverlay();
  showHome();
})();
