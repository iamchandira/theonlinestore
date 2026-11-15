/**
 * Sri Lanka's 25 districts (by province) with common delivery towns, for address forms.
 * Towns are suggestions only: the city field accepts any town. Shipping zones (Sprint 4) key off the district.
 */
export const DISTRICTS: { name: string; province: string; towns: string[] }[] = [
  { name: 'Colombo', province: 'Western', towns: ['Colombo 1–15', 'Battaramulla', 'Boralesgamuwa', 'Dehiwala', 'Homagama', 'Kaduwela', 'Kolonnawa', 'Kottawa', 'Maharagama', 'Malabe', 'Moratuwa', 'Mount Lavinia', 'Nugegoda', 'Padukka', 'Piliyandala', 'Rajagiriya', 'Avissawella', 'Sri Jayawardenepura Kotte'] },
  { name: 'Gampaha', province: 'Western', towns: ['Biyagama', 'Divulapitiya', 'Gampaha', 'Ja-Ela', 'Kadawatha', 'Kandana', 'Katunayake', 'Kelaniya', 'Kiribathgoda', 'Minuwangoda', 'Mirigama', 'Negombo', 'Nittambuwa', 'Ragama', 'Seeduwa', 'Veyangoda', 'Wattala'] },
  { name: 'Kalutara', province: 'Western', towns: ['Aluthgama', 'Bandaragama', 'Beruwala', 'Bulathsinhala', 'Horana', 'Ingiriya', 'Kalutara', 'Matugama', 'Panadura', 'Wadduwa'] },
  { name: 'Kandy', province: 'Central', towns: ['Akurana', 'Digana', 'Gampola', 'Kadugannawa', 'Kandy', 'Katugastota', 'Kundasale', 'Nawalapitiya', 'Peradeniya', 'Pilimathalawa', 'Wattegama'] },
  { name: 'Matale', province: 'Central', towns: ['Dambulla', 'Galewela', 'Matale', 'Naula', 'Rattota', 'Sigiriya', 'Ukuwela'] },
  { name: 'Nuwara Eliya', province: 'Central', towns: ['Hatton', 'Kotagala', 'Maskeliya', 'Nanu Oya', 'Nuwara Eliya', 'Ragala', 'Talawakele', 'Walapane'] },
  { name: 'Galle', province: 'Southern', towns: ['Ahangama', 'Ambalangoda', 'Baddegama', 'Bentota', 'Elpitiya', 'Galle', 'Hikkaduwa', 'Karapitiya', 'Koggala', 'Unawatuna'] },
  { name: 'Matara', province: 'Southern', towns: ['Akuressa', 'Deniyaya', 'Dikwella', 'Hakmana', 'Kamburupitiya', 'Matara', 'Mirissa', 'Weligama'] },
  { name: 'Hambantota', province: 'Southern', towns: ['Ambalantota', 'Beliatta', 'Hambantota', 'Tangalle', 'Tissamaharama', 'Weeraketiya'] },
  { name: 'Jaffna', province: 'Northern', towns: ['Chavakachcheri', 'Chunnakam', 'Jaffna', 'Karainagar', 'Kopay', 'Nallur', 'Point Pedro'] },
  { name: 'Kilinochchi', province: 'Northern', towns: ['Kilinochchi', 'Pallai', 'Paranthan'] },
  { name: 'Mannar', province: 'Northern', towns: ['Madhu', 'Mannar', 'Murunkan', 'Pesalai'] },
  { name: 'Vavuniya', province: 'Northern', towns: ['Cheddikulam', 'Nedunkeni', 'Vavuniya'] },
  { name: 'Mullaitivu', province: 'Northern', towns: ['Mullaitivu', 'Oddusuddan', 'Puthukudiyiruppu'] },
  { name: 'Batticaloa', province: 'Eastern', towns: ['Batticaloa', 'Eravur', 'Kaluwanchikudy', 'Kattankudy', 'Valaichchenai'] },
  { name: 'Ampara', province: 'Eastern', towns: ['Akkaraipattu', 'Ampara', 'Dehiattakandiya', 'Kalmunai', 'Pottuvil', 'Sainthamaruthu', 'Uhana'] },
  { name: 'Trincomalee', province: 'Eastern', towns: ['Kantale', 'Kinniya', 'Mutur', 'Nilaveli', 'Trincomalee'] },
  { name: 'Kurunegala', province: 'North Western', towns: ['Alawwa', 'Galgamuwa', 'Hettipola', 'Kuliyapitiya', 'Kurunegala', 'Mawathagama', 'Narammala', 'Nikaweratiya', 'Pannala', 'Polgahawela', 'Wariyapola'] },
  { name: 'Puttalam', province: 'North Western', towns: ['Anamaduwa', 'Chilaw', 'Dankotuwa', 'Kalpitiya', 'Marawila', 'Nattandiya', 'Puttalam', 'Wennappuwa'] },
  { name: 'Anuradhapura', province: 'North Central', towns: ['Anuradhapura', 'Eppawala', 'Kebithigollewa', 'Kekirawa', 'Medawachchiya', 'Mihintale', 'Thambuttegama'] },
  { name: 'Polonnaruwa', province: 'North Central', towns: ['Dimbulagala', 'Hingurakgoda', 'Kaduruwela', 'Medirigiriya', 'Polonnaruwa'] },
  { name: 'Badulla', province: 'Uva', towns: ['Badulla', 'Bandarawela', 'Ella', 'Hali-Ela', 'Haputale', 'Mahiyanganaya', 'Passara', 'Welimada'] },
  { name: 'Monaragala', province: 'Uva', towns: ['Bibile', 'Buttala', 'Kataragama', 'Monaragala', 'Siyambalanduwa', 'Wellawaya'] },
  { name: 'Ratnapura', province: 'Sabaragamuwa', towns: ['Balangoda', 'Eheliyagoda', 'Embilipitiya', 'Kahawatta', 'Kuruwita', 'Pelmadulla', 'Ratnapura'] },
  { name: 'Kegalle', province: 'Sabaragamuwa', towns: ['Dehiowita', 'Galigamuwa', 'Kegalle', 'Mawanella', 'Rambukkana', 'Ruwanwella', 'Warakapola', 'Yatiyantota'] },
]

export const DISTRICT_NAMES = DISTRICTS.map((d) => d.name)
