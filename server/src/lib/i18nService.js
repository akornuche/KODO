/**
 * Internationalization service for KODO platform
 * Supports Nigerian languages: English, Hausa, Yoruba, Igbo
 */

class I18nService {
  constructor() {
    this.currentLocale = 'en'; // Default locale
    this.supportedLocales = ['en', 'ha', 'yo', 'ig'];
    this.translations = {};

    // Load translations
    this.loadTranslations();
  }

  /**
   * Load translation files
   */
  loadTranslations() {
    // English translations (default/fallback)
    this.translations.en = {
      // Common
      welcome: 'Welcome to KODO',
      home: 'Home',
      search: 'Search',
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      profile: 'Profile',
      settings: 'Settings',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',

      // Authentication
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      loginButton: 'Sign In',
      registerButton: 'Create Account',
      loginSuccess: 'Login successful',
      registerSuccess: 'Registration successful',
      invalidCredentials: 'Invalid email or password',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',

      // Products
      products: 'Products',
      product: 'Product',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      deleteProduct: 'Delete Product',
      productTitle: 'Product Title',
      description: 'Description',
      price: 'Price',
      category: 'Category',
      condition: 'Condition',
      location: 'Location',
      images: 'Images',
      uploadImages: 'Upload Images',
      productAdded: 'Product added successfully',
      productUpdated: 'Product updated successfully',
      productDeleted: 'Product deleted successfully',

      // Categories
      electronics: 'Electronics',
      fashion: 'Fashion & Clothing',
      home: 'Home & Garden',
      vehicles: 'Vehicles',
      books: 'Books & Education',
      sports: 'Sports & Fitness',
      health: 'Health & Beauty',
      food: 'Food & Drinks',
      services: 'Services',
      other: 'Other',

      // Conditions
      new: 'New',
      likeNew: 'Like New',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',

      // Orders & Bidding
      orders: 'Orders',
      bids: 'Bids',
      placeBid: 'Place Bid',
      buyNow: 'Buy Now',
      orderPlaced: 'Order placed successfully',
      bidPlaced: 'Bid placed successfully',
      orderStatus: 'Order Status',
      pending: 'Pending',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',

      // User roles
      buyer: 'Buyer',
      seller: 'Seller',
      admin: 'Administrator',

      // Messages
      noProducts: 'No products found',
      noOrders: 'No orders found',
      searchPlaceholder: 'Search for products...',
      priceRange: 'Price Range',
      filter: 'Filter',
      sortBy: 'Sort By',
      newest: 'Newest',
      oldest: 'Oldest',
      priceLow: 'Price: Low to High',
      priceHigh: 'Price: High to Low',
      relevance: 'Relevance',

      // Validation
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordsNotMatch: 'Passwords do not match',

      // Errors
      networkError: 'Network error. Please try again.',
      serverError: 'Server error. Please try again later.',
      notFound: 'Page not found',
      unauthorized: 'You are not authorized to access this page',
      forbidden: 'Access forbidden'
    };

    // Hausa translations
    this.translations.ha = {
      welcome: 'Barka da zuwa KODO',
      home: 'Gida',
      search: 'Bincike',
      login: 'Shiga',
      logout: 'Fita',
      register: 'Yi rijista',
      profile: 'Bayanin martaba',
      settings: 'Saituna',
      save: 'Ajiye',
      cancel: 'Soke',
      delete: 'Share',
      edit: 'Gyara',
      view: 'Duba',
      back: 'Baya',
      next: 'Gaba',
      previous: 'Na baya',
      loading: 'Ana lodawa...',
      error: 'Kuskure',
      success: 'Nasara',

      email: 'Imel',
      password: 'Kalmar sirri',
      confirmPassword: 'Tabbatar da kalmar sirri',
      forgotPassword: 'Ka manta kalmar sirri?',
      resetPassword: 'Sake saita kalmar sirri',
      loginButton: 'Shiga',
      registerButton: 'Ƙirƙiri asusu',
      loginSuccess: 'An yi nasarar shiga',
      registerSuccess: 'An yi nasarar yin rijista',
      invalidCredentials: 'Imel ko kalmar sirri ba daidai ba',
      emailRequired: 'Ana buƙatar imel',
      passwordRequired: 'Ana buƙatar kalmar sirri',

      products: 'Kayan',
      product: 'Kaya',
      addProduct: 'Ƙara kaya',
      editProduct: 'Gyara kaya',
      deleteProduct: 'Share kaya',
      productTitle: 'Taken kaya',
      description: 'Bayani',
      price: 'Farashi',
      category: 'Rukuni',
      condition: 'Yanayin',
      location: 'Wuri',
      images: 'Hotuna',
      uploadImages: 'Loda hotuna',
      productAdded: 'An ƙara kaya cikin nasara',
      productUpdated: 'An sabunta kaya cikin nasara',
      productDeleted: 'An share kaya cikin nasara',

      electronics: 'Na\'urori lantarki',
      fashion: 'Tufafi da kawa',
      home: 'Gida da lambu',
      vehicles: 'Motoci',
      books: 'Littattafai da ilimi',
      sports: 'Wasanni da lafiya',
      health: 'Lafiya da kyau',
      food: 'Abinci da sha',
      services: 'Ayyuka',
      other: 'Sauran',

      new: 'Sabo',
      likeNew: 'Kamar sabo',
      good: 'Mai kyau',
      fair: 'Matsakaici',
      poor: 'Marar kyau',

      orders: 'Umarni',
      bids: 'Bid',
      placeBid: 'Sanya bid',
      buyNow: 'Siya yanzu',
      orderPlaced: 'An sanya oda cikin nasara',
      bidPlaced: 'An sanya bid cikin nasara',
      orderStatus: 'Matsayin oda',
      pending: 'Ana jira',
      confirmed: 'An tabbatar',
      shipped: 'An aika',
      delivered: 'An kai',
      cancelled: 'An soke',

      buyer: 'Mai saya',
      seller: 'Mai siyarwa',
      admin: 'Mai gudanarwa',

      noProducts: 'Ba a sami kayan ba',
      noOrders: 'Ba a sami umarni ba',
      searchPlaceholder: 'Bincika kayan...',
      priceRange: 'Kewayon farashi',
      filter: 'Tace',
      sortBy: 'Tsara ta',
      newest: 'Mafi sabon',
      oldest: 'Mafi daddewa',
      priceLow: 'Farashi: Ƙarami zuwa Babba',
      priceHigh: 'Farashi: Babba zuwa Ƙarami',
      relevance: 'Dacewa',

      required: 'Ana buƙatar wannan filin',
      invalidEmail: 'Da fatan shigar da imel mai inganci',
      passwordTooShort: 'Kalmar sirri dole ta kasance aƙalla haruffa 8',
      passwordsNotMatch: 'Kalmomin sirri ba su dace ba',

      networkError: 'Kuskuren cibiyar sadarwa. Da fatan sake gwadawa.',
      serverError: 'Kuskuren uwar garke. Da fatan sake gwadawa daga baya.',
      notFound: 'Ba a sami shafin ba',
      unauthorized: 'Ba ka da izini don shiga wannan shafin ba',
      forbidden: 'An hana shiga'
    };

    // Yoruba translations
    this.translations.yo = {
      welcome: 'Kaabo si KODO',
      home: 'Ile',
      search: 'Wa',
      login: 'Wole',
      logout: 'Jade',
      register: 'Forukọsilẹ',
      profile: 'Profaili',
      settings: 'Eto',
      save: 'Fi pamọ',
      cancel: 'Fagilee',
      delete: 'Paarẹ',
      edit: 'Ṣatunkọ',
      view: 'Wo',
      back: 'Pada',
      next: 'Atẹle',
      previous: 'Ti tẹlẹ',
      loading: 'N gbejade...',
      error: 'Asise',
      success: 'Aṣeyọri',

      email: 'Imeeli',
      password: 'Ọrọigbaniwọle',
      confirmPassword: 'Tun ọrọigbaniwọle se',
      forgotPassword: 'Ti gbagbe ọrọigbaniwọle?',
      resetPassword: 'Tun ọrọigbaniwọle se',
      loginButton: 'Wọle',
      registerButton: 'Ṣẹda akọọlẹ',
      loginSuccess: 'Wiwọle ṣaṣeyọri',
      registerSuccess: 'Iforukọsilẹ ṣaṣeyọri',
      invalidCredentials: 'Imeeli tabi ọrọigbaniwọle ti ko tọ',
      emailRequired: 'Imeeli nilo',
      passwordRequired: 'Ọrọigbaniwọle nilo',

      products: 'Ọja',
      product: 'Ọja',
      addProduct: 'Fi ọja kun',
      editProduct: 'Ṣatunkọ ọja',
      deleteProduct: 'Pa ọja rẹ',
      productTitle: 'Akọle ọja',
      description: 'Apejuwe',
      price: 'Iye owo',
      category: 'Ẹka',
      condition: 'Ipò',
      location: 'Ibi',
      images: 'Awọn aworan',
      uploadImages: 'Gbe awọn aworan kale',
      productAdded: 'A ti fi ọja kun ni aṣeyọri',
      productUpdated: 'A ti ṣe imudojuiwọn ọja ni aṣeyọri',
      productDeleted: 'A ti pa ọja rẹ ni aṣeyọri',

      electronics: 'Ẹrọ itanna',
      fashion: 'Aṣọ ati aṣọ',
      home: 'Ile ati ọgba',
      vehicles: 'Awọn ọkọ',
      books: 'Awọn iwe ati ẹkọ',
      sports: 'Idaraya ati amọdaju',
      health: 'Ilera ati ẹwa',
      food: 'Ounjẹ ati ohun mimu',
      services: 'Awọn iṣẹ',
      other: 'Omiiran',

      new: 'Tuntun',
      likeNew: 'Bii tuntun',
      good: 'O dara',
      fair: 'Deede',
      poor: 'Ti ko dara',

      orders: 'Awọn aṣẹ',
      bids: 'Awọn idu',
      placeBid: 'Gbe idu',
      buyNow: 'Ra ni bayi',
      orderPlaced: 'A gbe aṣẹ ni aṣeyọri',
      bidPlaced: 'A gbe idu ni aṣeyọri',
      orderStatus: 'Ipo aṣẹ',
      pending: 'Ni isunmọtosi',
      confirmed: 'Ti jẹrisi',
      shipped: 'Ti firanṣẹ',
      delivered: 'Ti firanṣẹ',
      cancelled: 'Ti fagilee',

      buyer: 'Olura',
      seller: 'Olutaja',
      admin: 'Alakoso',

      noProducts: 'Ko si awọn ọja ti a ri',
      noOrders: 'Ko si awọn aṣẹ ti a ri',
      searchPlaceholder: 'Wa awọn ọja...',
      priceRange: 'Sakani iye owo',
      filter: 'Sẹ̀',
      sortBy: 'Sa lẹsẹsẹ nipasẹ',
      newest: 'Titun julọ',
      oldest: 'Atijọ julọ',
      priceLow: 'Iye owo: Kekere si Nla',
      priceHigh: 'Iye owo: Nla si Kekere',
      relevance: 'Ibaamu',

      required: 'A nilo aaye yii',
      invalidEmail: 'Jọwọ tẹ imeeli ti o wulo',
      passwordTooShort: 'Ọrọigbaniwọle gbọdọ jẹ o kere ju awọn ohun kikọ 8',
      passwordsNotMatch: 'Awọn ọrọigbaniwọle ko baramu',

      networkError: 'Asise nẹtiwọki. Jọwọ tun gbiyanju.',
      serverError: 'Asise olupin. Jọwọ tun gbiyanju nigbamii.',
      notFound: 'Ko ri oju-iwe',
      unauthorized: 'O ko ni aṣẹ lati wọle si oju-iwe yii',
      forbidden: 'Wiwọle ti ni idinamọ'
    };

    // Igbo translations
    this.translations.ig = {
      welcome: 'Nnọọ na KODO',
      home: 'Ụlọ',
      search: 'Chọọ',
      login: 'Banye',
      logout: 'Pụọ',
      register: 'Debanye aha',
      profile: 'Profaịlụ',
      settings: 'Nhazi',
      save: 'Chekwa',
      cancel: 'Kagbuo',
      delete: 'Hichapụ',
      edit: 'Dezie',
      view: 'Lee',
      back: 'Laghachi',
      next: 'Osote',
      previous: 'Nke gara aga',
      loading: 'Na-ebugharị...',
      error: 'Njehie',
      success: 'Ọganiru',

      email: 'Ozi-e',
      password: 'Okwuntughe',
      confirmPassword: 'Kwenye okwuntughe',
      forgotPassword: 'Chefuru okwuntughe?',
      resetPassword: 'Tugharịa okwuntughe',
      loginButton: 'Banye',
      registerButton: 'Mepụta akaụntụ',
      loginSuccess: 'Nbanye gara nke ọma',
      registerSuccess: 'Ndebanye aha gara nke ọma',
      invalidCredentials: 'Ozi-e ma ọ bụ okwuntughe ezighi ezi',
      emailRequired: 'Achọrọ ozi-e',
      passwordRequired: 'Achọrọ okwuntughe',

      products: 'Ngwaahịa',
      product: 'Ngwaahịa',
      addProduct: 'Tinye ngwaahịa',
      editProduct: 'Dezie ngwaahịa',
      deleteProduct: 'Hichapụ ngwaahịa',
      productTitle: 'Aha ngwaahịa',
      description: 'Nkọwa',
      price: 'Ọnụ ahịa',
      category: 'Ụdị',
      condition: 'Ọnọdụ',
      location: 'Ebe',
      images: 'Foto',
      uploadImages: 'Bulite foto',
      productAdded: 'Agbakwunyere ngwaahịa nke ọma',
      productUpdated: 'Emelitere ngwaahịa nke ọma',
      productDeleted: 'Ehichapụrụ ngwaahịa nke ọma',

      electronics: 'Ngwaọrụ elektrọnik',
      fashion: 'Uwe na ejiji',
      home: 'Ụlọ na ubi',
      vehicles: 'Ụgbọ ala',
      books: 'Akwụkwọ na agụmakwụkwọ',
      sports: 'Egwu na ahụike',
      health: 'Ahụike na ịma mma',
      food: 'Nri na ihe ọṅụṅụ',
      services: 'Ọrụ',
      other: 'Ndị ọzọ',

      new: 'Ọhụrụ',
      likeNew: 'Dị ka ọhụrụ',
      good: 'Ọ dị mma',
      fair: 'Ezigbo',
      poor: 'Adịghị mma',

      orders: 'Iwu',
      bids: 'Ịgba aka',
      placeBid: 'Tinye ịgba aka',
      buyNow: 'Zụta ugbu a',
      orderPlaced: 'Edebere iwu nke ọma',
      bidPlaced: 'Edebere ịgba aka nke ọma',
      orderStatus: 'Ọnọdụ iwu',
      pending: 'Na-echere',
      confirmed: 'Akwadoro',
      shipped: 'Ezigaala',
      delivered: 'Enyefere',
      cancelled: 'Kagburu',

      buyer: 'Onye na-azụ',
      seller: 'Onye na-ere',
      admin: 'Onye nchịkwa',

      noProducts: 'Ahụghị ngwaahịa ọ bụla',
      noOrders: 'Ahụghị iwu ọ bụla',
      searchPlaceholder: 'Chọọ ngwaahịa...',
      priceRange: 'Oke ọnụ ahịa',
      filter: 'Nyochaa',
      sortBy: 'Hazie site na',
      newest: 'Nke kacha ọhụrụ',
      oldest: 'Nke kacha ochie',
      priceLow: 'Ọnụ ahịa: Obere ruo Nnukwu',
      priceHigh: 'Ọnụ ahịa: Nnukwu ruo Obere',
      relevance: 'Mmetụta',

      required: 'Achọrọ mpaghara a',
      invalidEmail: 'Biko tinye ozi-e ziri ezi',
      passwordTooShort: 'Okwuntughe ga-adịkarịa ala mkpụrụ edemede 8',
      passwordsNotMatch: 'Okwuntughe adabaghị',

      networkError: 'Njehie netwọk. Biko nwaa ọzọ.',
      serverError: 'Njehie sava. Biko nwaa ọzọ ma emechaa.',
      notFound: 'Ahụghị ibe',
      unauthorized: 'Ị nweghị ikike ịbanye na ibe a',
      forbidden: 'Amachibidoro ịbanye'
    };
  }

  /**
   * Set current locale
   * @param {string} locale - Locale code (en, ha, yo, ig)
   */
  setLocale(locale) {
    if (this.supportedLocales.includes(locale)) {
      this.currentLocale = locale;
    } else {
      this.currentLocale = 'en'; // Fallback to English
    }
  }

  /**
   * Get current locale
   * @returns {string} Current locale
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Get supported locales
   * @returns {Array} Array of supported locale codes
   */
  getSupportedLocales() {
    return [...this.supportedLocales];
  }

  /**
   * Translate a key
   * @param {string} key - Translation key
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Translated string
   */
  t(key, params = {}) {
    let translation = this.translations[this.currentLocale]?.[key] ||
                     this.translations.en[key] ||
                     key; // Fallback to key if not found

    // Simple parameter interpolation
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`\\$\\{${param}\\}`, 'g'), params[param]);
      });
    }

    return translation;
  }

  /**
   * Get all translations for current locale
   * @returns {Object} Translation object
   */
  getTranslations() {
    return { ...this.translations[this.currentLocale] };
  }

  /**
   * Get locale information
   * @param {string} locale - Locale code
   * @returns {Object} Locale information
   */
  getLocaleInfo(locale = this.currentLocale) {
    const localeInfo = {
      en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      ha: { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬' },
      yo: { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬' },
      ig: { code: 'ig', name: 'Igbo', nativeName: 'Igbo', flag: '🇳🇬' }
    };

    return localeInfo[locale] || localeInfo.en;
  }

  /**
   * Detect locale from request
   * @param {Object} req - Express request object
   * @returns {string} Detected locale
   */
  detectLocale(req) {
    // Check query parameter
    if (req.query.lang && this.supportedLocales.includes(req.query.lang)) {
      return req.query.lang;
    }

    // Check Accept-Language header
    const acceptLanguage = req.get('Accept-Language');
    if (acceptLanguage) {
      const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
      for (const lang of languages) {
        // Check for exact match
        if (this.supportedLocales.includes(lang)) {
          return lang;
        }
        // Check for language prefix (e.g., 'en-US' -> 'en')
        const prefix = lang.split('-')[0];
        if (this.supportedLocales.includes(prefix)) {
          return prefix;
        }
      }
    }

    // Check user preference from database (if user is logged in)
    if (req.user && req.user.locale && this.supportedLocales.includes(req.user.locale)) {
      return req.user.locale;
    }

    // Default to English
    return 'en';
  }

  /**
   * Format currency for current locale
   * @param {number} amount - Amount in Naira
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    const locale = this.currentLocale;
    const currency = 'NGN';
    const symbol = '₦';

    // Basic formatting - in production, use a proper internationalization library
    const formatted = new Intl.NumberFormat(locale === 'en' ? 'en-NG' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);

    // Replace with Naira symbol for Nigerian locales
    if (['ha', 'yo', 'ig'].includes(locale)) {
      return formatted.replace('₦', symbol);
    }

    return formatted;
  }

  /**
   * Format date for current locale
   * @param {Date} date - Date object
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date string
   */
  formatDate(date, options = {}) {
    const locale = this.currentLocale;

    // Map our locales to standard locale codes
    const localeMap = {
      en: 'en-NG',
      ha: 'ha-NG',
      yo: 'yo-NG',
      ig: 'ig-NG'
    };

    const localeCode = localeMap[locale] || 'en-NG';

    return new Intl.DateTimeFormat(localeCode, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(date);
  }

  /**
   * Format number for current locale
   * @param {number} number - Number to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted number string
   */
  formatNumber(number, options = {}) {
    const locale = this.currentLocale;
    const localeMap = {
      en: 'en-NG',
      ha: 'ha-NG',
      yo: 'yo-NG',
      ig: 'ig-NG'
    };

    const localeCode = localeMap[locale] || 'en-NG';

    return new Intl.NumberFormat(localeCode, options).format(number);
  }

  /**
   * Get localized validation messages
   * @returns {Object} Validation messages
   */
  getValidationMessages() {
    return {
      required: this.t('required'),
      email: this.t('invalidEmail'),
      minLength: (field, length) => this.t('passwordTooShort').replace('8', length),
      matches: this.t('passwordsNotMatch')
    };
  }
}

module.exports = new I18nService();