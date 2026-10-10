import type { Governorate } from "./tunisia";

/**
 * Délégations (« sous-zones ») de chaque gouvernorat, proposées au client dans le formulaire de livraison.
 * Le champ reste facultatif et le serveur n'impose pas cette liste : un client dont la zone manque peut choisir « Autre » et la saisir.
 */
export const DELEGATIONS: Record<Governorate, readonly string[]> = {
  "Ariana": ["Ariana Ville", "Ettadhamen", "Kalâat El Andalous", "La Soukra", "Mnihla", "Raoued", "Sidi Thabet"],
  "Béja": ["Béja Nord", "Béja Sud", "Amdoun", "Goubellat", "Medjez El Bab", "Nefza", "Téboursouk", "Testour", "Thibar"],
  "Ben Arous": ["Ben Arous", "Bou Mhel El Bassatine", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam Lif", "Mégrine", "Mohamedia", "Mornag", "Nouvelle Médina", "Radès"],
  "Bizerte": ["Bizerte Nord", "Bizerte Sud", "Djoumine", "El Alia", "Ghar El Melh", "Ghezala", "Mateur", "Menzel Bourguiba", "Menzel Jemil", "Ras Jebel", "Sejnane", "Tinja", "Utique", "Zarzouna"],
  "Gabès": ["Gabès Médina", "Gabès Ouest", "Gabès Sud", "El Hamma", "Ghannouch", "Mareth", "Matmata", "Menzel El Habib", "Métouia", "Nouvelle Matmata"],
  "Gafsa": ["Gafsa Nord", "Gafsa Sud", "Belkhir", "El Guettar", "El Ksar", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened", "Sidi Aïch"],
  "Jendouba": ["Jendouba", "Jendouba Nord", "Aïn Draham", "Balta Bou Aouane", "Bou Salem", "Fernana", "Ghardimaou", "Oued Mliz", "Tabarka"],
  "Kairouan": ["Kairouan Nord", "Kairouan Sud", "Alaâ", "Bou Hajla", "Chebika", "Echrarda", "Haffouz", "Hajeb El Ayoun", "Nasrallah", "Oueslatia", "Sbikha"],
  "Kasserine": ["Kasserine Nord", "Kasserine Sud", "El Ayoun", "Ezzouhour", "Fériana", "Foussana", "Hassi El Ferid", "Hidra", "Jedelienne", "Majel Bel Abbès", "Sbeitla", "Sbiba", "Thala"],
  "Kébili": ["Kébili Nord", "Kébili Sud", "Douz Nord", "Douz Sud", "Faouar", "Souk Lahad"],
  "Le Kef": ["Kef Ouest", "Kef Est", "Dahmani", "El Ksour", "Jérissa", "Kalaat Khasba", "Kalâat Senan", "Nebeur", "Sakiet Sidi Youssef", "Sers", "Tajerouine"],
  "Mahdia": ["Mahdia", "Bou Merdès", "Chebba", "Chorbane", "El Jem", "Hbira", "Ksour Essaf", "Melloulèche", "Ouled Chamekh", "Sidi Alouane", "Essouassi"],
  "La Manouba": ["Manouba", "Borj El Amri", "Denden", "Djedeida", "Douar Hicher", "El Battan", "Mornaguia", "Oued Ellil", "Tebourba"],
  "Médenine": ["Médenine Nord", "Médenine Sud", "Ben Gardane", "Béni Khedache", "Djerba Ajim", "Djerba Houmt Souk", "Djerba Midoun", "Sidi Makhlouf", "Zarzis"],
  "Monastir": ["Monastir", "Bekalta", "Bembla", "Beni Hassen", "Jemmal", "Ksar Hellal", "Ksibet El Médiouni", "Moknine", "Ouerdanine", "Sahline", "Sayada-Lamta-Bou Hajar", "Téboulba", "Zéramdine"],
  "Nabeul": ["Nabeul", "Béni Khalled", "Béni Khiar", "Bou Argoub", "Dar Chaâbane El Fehri", "El Haouaria", "El Mida", "Grombalia", "Hammam Ghezaz", "Hammamet", "Kélibia", "Korba", "Menzel Bouzelfa", "Menzel Temime", "Soliman", "Takelsa"],
  "Sfax": ["Sfax Ville", "Sfax Ouest", "Sfax Sud", "Agareb", "Bir Ali Ben Khalifa", "El Amra", "El Hencha", "Ghraïba", "Jebiniana", "Kerkennah", "Mahrès", "Menzel Chaker", "Sakiet Eddaïer", "Sakiet Ezzit", "Skhira", "Thyna"],
  "Sidi Bouzid": ["Sidi Bouzid Ouest", "Sidi Bouzid Est", "Bir El Hafey", "Cebbala Ouled Asker", "Jilma", "Meknassy", "Menzel Bouzaiane", "Mezzouna", "Ouled Haffouz", "Regueb", "Sidi Ali Ben Aoun", "Souk Jedid"],
  "Siliana": ["Siliana Nord", "Siliana Sud", "Bargou", "Bou Arada", "El Aroussa", "El Krib", "Gaâfour", "Kesra", "Makthar", "Rouhia", "Sidi Bou Rouis"],
  "Sousse": ["Sousse Médina", "Sousse Jawhara", "Sousse Riadh", "Sousse Sidi Abdelhamid", "Akouda", "Bouficha", "Enfidha", "Hammam Sousse", "Hergla", "Kalâa Kebira", "Kalâa Seghira", "Kondar", "Msaken", "Sidi Bou Ali", "Sidi El Héni", "Zaouiet Sousse"],
  "Tataouine": ["Tataouine Nord", "Tataouine Sud", "Bir Lahmar", "Dehiba", "Ghomrassen", "Remada", "Smâr"],
  "Tozeur": ["Tozeur", "Degache", "Hazoua", "Nefta", "Tameghza"],
  "Tunis": ["Tunis Médina", "Bab Bhar", "Bab Souika", "Carthage", "Cité El Khadra", "Djebel Jelloud", "El Kabaria", "El Menzah", "El Omrane", "El Omrane Supérieur", "Ettahrir", "Ezzouhour", "Hraïria", "La Goulette", "La Marsa", "Le Bardo", "Le Kram", "Sidi El Béchir", "Sidi Hassine", "Séjoumi"],
  "Zaghouan": ["Zaghouan", "Bir Mcherga", "Djebel Oust", "El Fahs", "Nadhour", "Zriba"],
};

export const delegationsOf = (governorate: string): readonly string[] => (DELEGATIONS as Record<string, readonly string[] | undefined>)[governorate] ?? [];
