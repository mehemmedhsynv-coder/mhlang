export interface PredefinedLanguage {
  code: string;
  name: string;
}

export const PREDEFINED_LANGUAGES: readonly PredefinedLanguage[] = [
  { code: "az", name: "Azerbaijani" },
  { code: "en", name: "English" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
];

export const CUSTOM_LANGUAGE_VALUE = "__custom__";

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(-[a-z]{2,8})?$/i;

export function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidLanguageCode(code: string): boolean {
  return LANGUAGE_CODE_PATTERN.test(code.trim());
}

export function findLanguageName(code: string): string {
  const found = PREDEFINED_LANGUAGES.find((lang) => lang.code === code);
  return found ? found.name : code;
}

export interface ExampleMessages {
  common: {
    hello: string;
    welcome: string;
    helloUser: string;
  };
  auth: {
    login: {
      title: string;
      description: string;
    };
  };
}

export const EXAMPLE_MESSAGES: Record<string, ExampleMessages> = {
  az: {
    common: { hello: "Salam", welcome: "Xoş gəlmisiniz", helloUser: "Salam, {{name}}!" },
    auth: {
      login: {
        title: "Daxil ol",
        description: "Hesabınıza daxil olmaq üçün məlumatlarınızı daxil edin.",
      },
    },
  },
  en: {
    common: { hello: "Hello", welcome: "Welcome", helloUser: "Hello, {{name}}!" },
    auth: {
      login: {
        title: "Log in",
        description: "Enter your details to access your account.",
      },
    },
  },
  ru: {
    common: { hello: "Привет", welcome: "Добро пожаловать", helloUser: "Привет, {{name}}!" },
    auth: {
      login: {
        title: "Войти",
        description: "Введите данные для входа в аккаунт.",
      },
    },
  },
  tr: {
    common: { hello: "Merhaba", welcome: "Hoş geldiniz", helloUser: "Merhaba, {{name}}!" },
    auth: {
      login: {
        title: "Giriş yap",
        description: "Hesabınıza erişmek için bilgilerinizi girin.",
      },
    },
  },
  de: {
    common: { hello: "Hallo", welcome: "Willkommen", helloUser: "Hallo, {{name}}!" },
    auth: {
      login: {
        title: "Anmelden",
        description: "Gib deine Daten ein, um auf dein Konto zuzugreifen.",
      },
    },
  },
  fr: {
    common: { hello: "Bonjour", welcome: "Bienvenue", helloUser: "Bonjour, {{name}}!" },
    auth: {
      login: {
        title: "Connexion",
        description: "Entrez vos informations pour accéder à votre compte.",
      },
    },
  },
  es: {
    common: { hello: "Hola", welcome: "Bienvenido", helloUser: "¡Hola, {{name}}!" },
    auth: {
      login: {
        title: "Iniciar sesión",
        description: "Introduce tus datos para acceder a tu cuenta.",
      },
    },
  },
};

/** Falls back to the English example structure for codes without curated translations
 * (e.g. custom languages), so scaffolded examples always share the same shape. */
export function getExampleMessages(code: string): ExampleMessages {
  return EXAMPLE_MESSAGES[code] ?? EXAMPLE_MESSAGES["en"]!;
}
