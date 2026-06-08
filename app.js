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

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo(0, 0);
  }

  function goHome() {
    closeShareMenu();
    showScreen('home');
  }

  function openFact(category, index) {
    current = { category, index };
    factImage.src = imagePath(category, 'עובדה', index);
    factImage.alt = `${category} עובדה ${index}`;
    showScreen('fact');
  }

  // מעבר עם אנימציית היפוך כרטיס (rotateY) — רק הריבוע המרכזי מסתובב ומחליף תוכן.
  // ה-flipCard מציג חיתוך של אזור הכרטיס מתוך התמונה המלאה; הרקע (לוגו/כותרת תחתונה)
  // והכפתורים מתחלפים בנקודת ה-90° כשהכרטיס "על הצד" ולא נראה.
  const flipCard = document.getElementById('flip-card');

  function setFlipCardImage(src) {
    flipCard.style.backgroundImage = `url("${src}")`;
  }

  function flipTransition(fromSrc, swapFn, getToSrc) {
    setFlipCardImage(fromSrc);
    // reflow כדי לאתחל את האנימציה
    void flipCard.offsetWidth;
    flipCard.classList.add('flip-out');
    const onOut = () => {
      flipCard.removeEventListener('animationend', onOut);
      flipCard.classList.remove('flip-out');
      swapFn();
      setFlipCardImage(getToSrc());
      void flipCard.offsetWidth;
      flipCard.classList.add('flip-in');
      const onIn = () => {
        flipCard.removeEventListener('animationend', onIn);
        flipCard.classList.remove('flip-in');
        // לנקות display מוטבע כדי שכלל ה-CSS הבסיסי (display:none) יחזור לשלוט,
        // אחרת ההיפוך הבא יתרחש על אלמנט מוסתר וה-animationend לא יורה.
        flipCard.style.display = '';
      };
      flipCard.addEventListener('animationend', onIn);
    };
    flipCard.addEventListener('animationend', onOut);
  }

  function openImage() {
    if (!current.category) return;
    const fromSrc = factImage.src;
    flipTransition(
      fromSrc,
      () => {
        imageImage.src = imagePath(current.category, 'דימוי', current.index);
        imageImage.alt = `${current.category} דימוי ${current.index}`;
        showScreen('image');
      },
      () => imageImage.src,
    );
  }

  function backToFact() {
    closeShareMenu();
    const fromSrc = imageImage.src;
    flipTransition(fromSrc, () => showScreen('fact'), () => factImage.src);
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
        const W = frameW;
        const H = pad + logo.sh + gap + card.sh + pad;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, logo.sx, logo.sy, logo.sw, logo.sh,
          (W - logo.sw) / 2, pad, logo.sw, logo.sh);
        ctx.drawImage(img, card.sx, card.sy, card.sw, card.sh,
          (W - card.sw) / 2, pad + logo.sh + gap, card.sw, card.sh);
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
  showScreen('home');
})();
