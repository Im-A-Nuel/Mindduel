export type Category =
  | 'General Knowledge'
  | 'Crypto & Web3'
  | 'Science'
  | 'History'
  | 'Math'
  | 'Pop Culture'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  question: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  category: Category
  difficulty: Difficulty
  timeLimit: number
}

export const QUESTIONS: Question[] = [
  // ── General Knowledge ──────────────────────────────────────────────
  { id: 'gk01', question: 'What is the capital city of France?', options: ['Berlin', 'Madrid', 'Paris', 'Rome'], correctIndex: 2, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk02', question: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk03', question: 'Which is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk04', question: 'What is the capital city of Japan?', options: ['Osaka', 'Kyoto', 'Tokyo', 'Hiroshima'], correctIndex: 2, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk05', question: 'How many bones are in the adult human body?', options: ['186', '196', '206', '216'], correctIndex: 2, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk06', question: 'What does CPU stand for?', options: ['Core Processing Unit', 'Central Processing Unit', 'Computer Power Unit', 'Central Program Utility'], correctIndex: 1, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk07', question: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyper Transfer Markup Logic', 'HyperText Modern Layout'], correctIndex: 0, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk08', question: 'What is the binary representation of decimal 10?', options: ['0101', '1001', '1010', '1100'], correctIndex: 2, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk09', question: 'How many possible winning combinations in 3×3 Tic Tac Toe?', options: ['6', '8', '10', '12'], correctIndex: 1, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk10', question: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Falcon', 'Greyhound'], correctIndex: 1, category: 'General Knowledge', difficulty: 'easy', timeLimit: 15 },
  { id: 'gk11', question: 'How many letters are in the English alphabet?', options: ['24', '25', '26', '27'], correctIndex: 2, category: 'General Knowledge', difficulty: 'easy', timeLimit: 10 },
  { id: 'gk12', question: 'Which country has the most natural lakes?', options: ['Russia', 'USA', 'Canada', 'Brazil'], correctIndex: 2, category: 'General Knowledge', difficulty: 'hard', timeLimit: 20 },

  // ── Crypto & Web3 ──────────────────────────────────────────────────
  { id: 'cw01', question: 'Which consensus mechanism does Solana use to order transactions?', options: ['Proof of Work', 'Proof of Stake', 'Proof of History', 'DPoS'], correctIndex: 2, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw02', question: "What is Solana's high-performance virtual machine called?", options: ['EVM', 'SVM', 'Wasm Runtime', 'LLVM'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw03', question: 'What does "TPS" stand for in blockchain?', options: ['Token Processing Speed', 'Transactions Per Second', 'Total Protocol Scale', 'Trust Proof System'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 15 },
  { id: 'cw04', question: 'What is a Program Derived Address (PDA) on Solana?', options: ['A wallet owned by a program', 'An address with no private key, derived from seeds', 'A temporary pending address', 'An address for NFT metadata'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw05', question: 'Which framework is used to write Solana programs in Rust?', options: ['Hardhat', 'Truffle', 'Anchor', 'Foundry'], correctIndex: 2, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw06', question: 'What is the smallest unit of SOL?', options: ['Wei', 'Satoshi', 'Lamport', 'Gwei'], correctIndex: 2, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 15 },
  { id: 'cw07', question: 'In what year was the Bitcoin whitepaper published?', options: ['2006', '2007', '2008', '2009'], correctIndex: 2, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 20 },
  { id: 'cw08', question: 'Which year was Solana mainnet launched?', options: ['2018', '2019', '2020', '2021'], correctIndex: 2, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw09', question: 'What programming language is used to write native Solana programs?', options: ['Go', 'Rust', 'C++', 'TypeScript'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 15 },
  { id: 'cw10', question: 'What does NFT stand for?', options: ['New Financial Token', 'Non-Fungible Token', 'Network File Transfer', 'Native Finance Tracker'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 15 },
  { id: 'cw11', question: 'What is the name of Ethereum\'s transition from PoW to PoS?', options: ['The Shift', 'The Merge', 'The Fork', 'The Bridge'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw12', question: 'What does DeFi stand for?', options: ['Decentralized Finance', 'Digital Finance', 'Distributed Framework', 'Defined Fees'], correctIndex: 0, category: 'Crypto & Web3', difficulty: 'easy', timeLimit: 15 },
  { id: 'cw13', question: 'Which Solana standard is used for fungible tokens (like USDC)?', options: ['ERC-20', 'SPL Token', 'BEP-20', 'Metaplex Token'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },

  // ── Science ────────────────────────────────────────────────────────
  { id: 'sc01', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc02', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc03', question: 'Approximately how fast does light travel in a vacuum?', options: ['150,000 km/s', '300,000 km/s', '450,000 km/s', '600,000 km/s'], correctIndex: 1, category: 'Science', difficulty: 'medium', timeLimit: 20 },
  { id: 'sc04', question: 'What is the atomic number of hydrogen?', options: ['1', '2', '4', '8'], correctIndex: 0, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc05', question: 'Which gas do plants absorb during photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc06', question: 'What is the atomic number of carbon?', options: ['4', '6', '8', '12'], correctIndex: 1, category: 'Science', difficulty: 'medium', timeLimit: 15 },
  { id: 'sc07', question: 'At what temperature (°C) does water boil at sea level?', options: ['90', '95', '100', '105'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 10 },
  { id: 'sc08', question: 'What is the nearest star to Earth (besides the Sun)?', options: ['Sirius', 'Betelgeuse', 'Proxima Centauri', 'Vega'], correctIndex: 2, category: 'Science', difficulty: 'medium', timeLimit: 20 },
  { id: 'sc09', question: 'Which is the largest planet in our solar system?', options: ['Saturn', 'Neptune', 'Uranus', 'Jupiter'], correctIndex: 3, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc10', question: 'What molecule is known as H₂O?', options: ['Hydrogen Peroxide', 'Hydrochloric Acid', 'Water', 'Ammonia'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 10 },
  { id: 'sc11', question: 'What force keeps planets in orbit around the Sun?', options: ['Magnetism', 'Gravity', 'Electrostatic Force', 'Nuclear Force'], correctIndex: 1, category: 'Science', difficulty: 'easy', timeLimit: 15 },
  { id: 'sc12', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi Apparatus'], correctIndex: 2, category: 'Science', difficulty: 'easy', timeLimit: 15 },

  // ── History ────────────────────────────────────────────────────────
  { id: 'hi01', question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi02', question: 'Who was the first President of the United States?', options: ['John Adams', 'Benjamin Franklin', 'Thomas Jefferson', 'George Washington'], correctIndex: 3, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi03', question: 'In what city was the Eiffel Tower built?', options: ['Rome', 'Berlin', 'London', 'Paris'], correctIndex: 3, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi04', question: 'In what year did Christopher Columbus reach the Americas?', options: ['1488', '1492', '1498', '1502'], correctIndex: 1, category: 'History', difficulty: 'easy', timeLimit: 20 },
  { id: 'hi05', question: 'Who was the first human to walk on the Moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Alan Shepard'], correctIndex: 2, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi06', question: 'In what year did the Berlin Wall fall?', options: ['1987', '1988', '1989', '1991'], correctIndex: 2, category: 'History', difficulty: 'medium', timeLimit: 20 },
  { id: 'hi07', question: 'Which ancient wonder was located in Alexandria, Egypt?', options: ['The Colossus', 'The Lighthouse', 'The Mausoleum', 'The Hanging Gardens'], correctIndex: 1, category: 'History', difficulty: 'medium', timeLimit: 20 },
  { id: 'hi08', question: 'What empire was ruled by Genghis Khan?', options: ['Ottoman', 'Roman', 'Mongol', 'Persian'], correctIndex: 2, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi09', question: 'In which year did World War I begin?', options: ['1912', '1914', '1916', '1918'], correctIndex: 1, category: 'History', difficulty: 'easy', timeLimit: 15 },
  { id: 'hi10', question: 'Who wrote the Declaration of Independence?', options: ['George Washington', 'Benjamin Franklin', 'John Adams', 'Thomas Jefferson'], correctIndex: 3, category: 'History', difficulty: 'medium', timeLimit: 20 },

  // ── Math ───────────────────────────────────────────────────────────
  { id: 'ma01', question: 'What is the value of π rounded to 2 decimal places?', options: ['3.12', '3.14', '3.16', '3.18'], correctIndex: 1, category: 'Math', difficulty: 'easy', timeLimit: 15 },
  { id: 'ma02', question: 'What is 7 × 8?', options: ['48', '54', '56', '64'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 10 },
  { id: 'ma03', question: 'What is the square root of 144?', options: ['10', '11', '12', '14'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 15 },
  { id: 'ma04', question: 'What is 2 to the power of 10?', options: ['512', '1000', '1024', '2048'], correctIndex: 2, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma05', question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 15 },
  { id: 'ma06', question: 'What is the next prime number after 13?', options: ['14', '15', '17', '19'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 15 },
  { id: 'ma07', question: 'What is the area of a circle with radius 7? (use π ≈ 22/7)', options: ['44', '88', '154', '308'], correctIndex: 2, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma08', question: 'What is the sum of angles in a triangle?', options: ['90°', '120°', '180°', '360°'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 10 },
  { id: 'ma09', question: 'What is log₁₀(1000)?', options: ['2', '3', '4', '10'], correctIndex: 1, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma10', question: 'How many edges does a cube have?', options: ['6', '8', '10', '12'], correctIndex: 3, category: 'Math', difficulty: 'medium', timeLimit: 15 },
  { id: 'ma11', question: 'What is the Fibonacci number after 21?', options: ['29', '31', '34', '36'], correctIndex: 2, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma12', question: 'What is 5³?', options: ['15', '25', '100', '125'], correctIndex: 3, category: 'Math', difficulty: 'easy', timeLimit: 10 },
  { id: 'ma13', question: 'A train travels 60 km in 45 minutes. What is its speed in km/h?', options: ['60', '75', '80', '90'], correctIndex: 2, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma14', question: 'What is the GCD of 48 and 18?', options: ['3', '6', '9', '12'], correctIndex: 1, category: 'Math', difficulty: 'hard', timeLimit: 20 },

  // ── Pop Culture ────────────────────────────────────────────────────
  { id: 'pc01', question: 'Which movie features the quote "I\'ll be back"?', options: ['RoboCop', 'Die Hard', 'The Terminator', 'Predator'], correctIndex: 2, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc02', question: 'In which TV show would you find the character Walter White?', options: ['Dexter', 'Ozark', 'Breaking Bad', 'Better Call Saul'], correctIndex: 2, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc03', question: 'What platform made short-form vertical videos mainstream globally?', options: ['Instagram', 'Snapchat', 'TikTok', 'YouTube Shorts'], correctIndex: 2, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc04', question: 'Which artist released the album "Renaissance" in 2022?', options: ['Rihanna', 'Beyoncé', 'Adele', 'Taylor Swift'], correctIndex: 1, category: 'Pop Culture', difficulty: 'medium', timeLimit: 15 },
  { id: 'pc05', question: 'What is the highest-grossing video game franchise of all time?', options: ['Call of Duty', 'Grand Theft Auto', 'Pokémon', 'Mario'], correctIndex: 2, category: 'Pop Culture', difficulty: 'medium', timeLimit: 20 },
  { id: 'pc06', question: 'Which superhero is known as the "Merc with a Mouth"?', options: ['Spider-Man', 'Deadpool', 'Wolverine', 'Cable'], correctIndex: 1, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc07', question: 'In which year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correctIndex: 2, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc08', question: 'Who directed the Avengers: Endgame?', options: ['Joss Whedon', 'Jon Favreau', 'James Gunn', 'Anthony & Joe Russo'], correctIndex: 3, category: 'Pop Culture', difficulty: 'medium', timeLimit: 20 },
  { id: 'pc09', question: 'What fictional country is Black Panther\'s homeland?', options: ['Genosha', 'Wakanda', 'Latveria', 'Sokovia'], correctIndex: 1, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },
  { id: 'pc10', question: 'Which streaming show features the Upside Down?', options: ['Dark', 'Stranger Things', 'Manifest', 'Lost'], correctIndex: 1, category: 'Pop Culture', difficulty: 'easy', timeLimit: 15 },

  // ── Expansion pack ──────────────────────────────────────────────────
  // Balances every category across easy/medium/hard so a (category ×
  // difficulty) filter never collapses to a 1-2 question pool — which made
  // the SAME question repeat with only its A/B/C/D options reshuffled.
  // Target after this block: every category has ≥8 HARD questions, so a
  // single-category hard match (Tic-Tac-Toe runs up to ~9 turns) never repeats.

  // General Knowledge — medium + hard top-up
  { id: 'gk13', question: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctIndex: 1, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk14', question: 'How many time zones does the world have?', options: ['12', '24', '36', '48'], correctIndex: 1, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk15', question: 'What is the currency of Switzerland?', options: ['Euro', 'Krona', 'Swiss Franc', 'Schilling'], correctIndex: 2, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk16', question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correctIndex: 2, category: 'General Knowledge', difficulty: 'medium', timeLimit: 20 },
  { id: 'gk17', question: 'Which country has the largest population in the world?', options: ['China', 'India', 'USA', 'Indonesia'], correctIndex: 1, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk18', question: 'What is the smallest country in the world by area?', options: ['Monaco', 'Nauru', 'Vatican City', 'San Marino'], correctIndex: 2, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk19', question: 'Which language has the most native speakers worldwide?', options: ['English', 'Spanish', 'Hindi', 'Mandarin Chinese'], correctIndex: 3, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk20', question: 'The Strait of Gibraltar connects the Atlantic Ocean to which sea?', options: ['Red Sea', 'Black Sea', 'Mediterranean Sea', 'Caspian Sea'], correctIndex: 2, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk21', question: 'Which desert is the largest hot desert in the world?', options: ['Gobi', 'Kalahari', 'Sahara', 'Arabian'], correctIndex: 2, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk22', question: 'Mount Kilimanjaro is located in which country?', options: ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], correctIndex: 1, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },
  { id: 'gk23', question: 'Which country has 11 official languages?', options: ['India', 'Switzerland', 'South Africa', 'Singapore'], correctIndex: 2, category: 'General Knowledge', difficulty: 'hard', timeLimit: 25 },

  // Crypto & Web3 — medium + hard top-up
  { id: 'cw14', question: 'What does a "blockhash" provide in a Solana transaction?', options: ['Encryption', 'Recent-ness / replay protection', 'Validator selection', 'Fee calculation'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw15', question: 'Which standard wallet library do most Solana dApps integrate?', options: ['WalletConnect', '@solana/wallet-adapter', 'MetaMask SDK', 'Web3Modal'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw16', question: 'What does a "gasless" / sponsored transaction mean?', options: ['No instructions run', 'A third party pays the fee', 'Fees are burned', 'It skips the mempool'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'medium', timeLimit: 20 },
  { id: 'cw17', question: 'On Solana, what is "rent" paid for?', options: ['Validator electricity', 'Keeping account data alive in state', 'Network bandwidth', 'NFT royalties'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw18', question: 'In Anchor, which macro defines the instruction-handlers module?', options: ['#[account]', '#[program]', '#[derive(Accounts)]', '#[error_code]'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw19', question: 'An SPL Associated Token Account (ATA) is deterministically derived from?', options: ['Owner + mint', 'Owner + nonce', 'Mint + slot', 'Owner only'], correctIndex: 0, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw20', question: 'Roughly how long is a single Solana slot targeted to be?', options: ['100 ms', '400 ms', '2 s', '12 s'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw21', question: 'Which program owns all SPL token accounts on Solana?', options: ['System Program', 'Token Program', 'Stake Program', 'Vote Program'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },
  { id: 'cw22', question: 'What cryptographic curve does Solana use for account keypairs?', options: ['secp256k1', 'ed25519', 'P-256', 'BLS12-381'], correctIndex: 1, category: 'Crypto & Web3', difficulty: 'hard', timeLimit: 25 },

  // Science — medium + hard top-up (had ZERO hard before)
  { id: 'sc13', question: 'What is the SI symbol for the speed-of-light constant?', options: ['c', 'g', 'h', 'k'], correctIndex: 0, category: 'Science', difficulty: 'medium', timeLimit: 20 },
  { id: 'sc14', question: 'What is the pH of pure water at 25°C?', options: ['0', '7', '10', '14'], correctIndex: 1, category: 'Science', difficulty: 'medium', timeLimit: 20 },
  { id: 'sc15', question: 'Which blood type is the universal donor?', options: ['A+', 'AB+', 'O-', 'B-'], correctIndex: 2, category: 'Science', difficulty: 'medium', timeLimit: 20 },
  { id: 'sc16', question: 'Which planet has the most moons (recent counts)?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctIndex: 1, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc17', question: 'Which subatomic particle count determines the chemical element?', options: ['Neutrons', 'Protons', 'Electrons', 'Photons'], correctIndex: 1, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc18', question: 'What is the SI unit of electrical resistance?', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], correctIndex: 2, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc19', question: 'DNA is composed of how many nucleotide base types?', options: ['2', '3', '4', '5'], correctIndex: 2, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc20', question: 'What is the most abundant element in the universe?', options: ['Oxygen', 'Carbon', 'Hydrogen', 'Helium'], correctIndex: 2, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc21', question: 'What phenomenon causes a rainbow?', options: ['Reflection only', 'Refraction and dispersion of light', 'Magnetic fields', 'Radiation'], correctIndex: 1, category: 'Science', difficulty: 'hard', timeLimit: 25 },
  { id: 'sc22', question: 'Which scientist proposed the three laws of motion?', options: ['Einstein', 'Newton', 'Galileo', 'Bohr'], correctIndex: 1, category: 'Science', difficulty: 'hard', timeLimit: 25 },

  // History — medium + hard top-up (had ZERO hard before)
  { id: 'hi11', question: 'The Renaissance began in which country?', options: ['France', 'England', 'Italy', 'Spain'], correctIndex: 2, category: 'History', difficulty: 'medium', timeLimit: 20 },
  { id: 'hi12', question: 'Which treaty ended World War I?', options: ['Treaty of Paris', 'Treaty of Versailles', 'Treaty of Tordesillas', 'Treaty of Ghent'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi13', question: 'Who was the first woman to win a Nobel Prize?', options: ['Rosalind Franklin', 'Marie Curie', 'Ada Lovelace', 'Dorothy Hodgkin'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi14', question: 'Which ancient city was destroyed by Mount Vesuvius in 79 AD?', options: ['Carthage', 'Pompeii', 'Troy', 'Athens'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi15', question: 'Who co-wrote the "Communist Manifesto" with Engels?', options: ['Lenin', 'Karl Marx', 'Trotsky', 'Stalin'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi16', question: 'The Magna Carta was signed in which year?', options: ['1066', '1215', '1492', '1607'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi17', question: 'Which civilization developed cuneiform, the first known writing system?', options: ['Egyptians', 'Sumerians', 'Mayans', 'Chinese'], correctIndex: 1, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi18', question: 'The Ottoman Empire was officially dissolved in which year?', options: ['1899', '1912', '1922', '1945'], correctIndex: 2, category: 'History', difficulty: 'hard', timeLimit: 25 },
  { id: 'hi19', question: 'Who was the longest-reigning British monarch before Elizabeth II?', options: ['Queen Victoria', 'George III', 'Henry VIII', 'Elizabeth I'], correctIndex: 0, category: 'History', difficulty: 'hard', timeLimit: 25 },

  // Math — medium + hard top-up
  { id: 'ma15', question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '14'], correctIndex: 2, category: 'Math', difficulty: 'easy', timeLimit: 10 },
  { id: 'ma16', question: 'Solve for x: 3x + 6 = 21', options: ['3', '4', '5', '6'], correctIndex: 2, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma17', question: 'What is the value of 2⁸?', options: ['128', '256', '512', '1024'], correctIndex: 1, category: 'Math', difficulty: 'medium', timeLimit: 20 },
  { id: 'ma18', question: 'What is the derivative of x² with respect to x?', options: ['x', '2x', 'x²', '2'], correctIndex: 1, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma19', question: 'What is the value of the golden ratio (φ) to 2 decimals?', options: ['1.41', '1.62', '2.72', '3.14'], correctIndex: 1, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma20', question: 'How many distinct ways can the letters of "MATH" be arranged?', options: ['12', '16', '24', '48'], correctIndex: 2, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma21', question: 'What is the integral of 1/x dx?', options: ['x²/2', 'ln|x| + C', '-1/x²', 'e^x'], correctIndex: 1, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma22', question: 'What is 7! (7 factorial)?', options: ['720', '2520', '5040', '40320'], correctIndex: 2, category: 'Math', difficulty: 'hard', timeLimit: 25 },
  { id: 'ma23', question: 'What is the sum of the interior angles of a hexagon?', options: ['540°', '720°', '900°', '1080°'], correctIndex: 1, category: 'Math', difficulty: 'hard', timeLimit: 25 },

  // Pop Culture — medium + hard top-up (had ZERO hard before)
  { id: 'pc11', question: 'In "The Lord of the Rings", what is the name of Frodo\'s gardener?', options: ['Merry', 'Pippin', 'Samwise Gamgee', 'Bilbo'], correctIndex: 2, category: 'Pop Culture', difficulty: 'medium', timeLimit: 20 },
  { id: 'pc12', question: 'Who painted "The Starry Night"?', options: ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso', 'Salvador Dalí'], correctIndex: 1, category: 'Pop Culture', difficulty: 'medium', timeLimit: 20 },
  { id: 'pc13', question: 'What is the highest-grossing film of all time (unadjusted)?', options: ['Titanic', 'Avengers: Endgame', 'Avatar', 'The Force Awakens'], correctIndex: 2, category: 'Pop Culture', difficulty: 'medium', timeLimit: 20 },
  { id: 'pc14', question: 'Which film won the first-ever Academy Award for Best Picture (1929)?', options: ['Wings', 'Sunrise', 'The Jazz Singer', 'Metropolis'], correctIndex: 0, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc15', question: 'Who composed the score for the original "Star Wars"?', options: ['Hans Zimmer', 'John Williams', 'Ennio Morricone', 'Danny Elfman'], correctIndex: 1, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc16', question: 'Which band released "The Dark Side of the Moon"?', options: ['Led Zeppelin', 'Pink Floyd', 'The Who', 'Queen'], correctIndex: 1, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc17', question: 'Which video game is the best-selling of all time?', options: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], correctIndex: 1, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc18', question: 'Which Studio Ghibli film won an Academy Award?', options: ['My Neighbor Totoro', 'Spirited Away', 'Princess Mononoke', 'Akira'], correctIndex: 1, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc19', question: 'Which actor has won the most Academy Awards for acting (4)?', options: ['Jack Nicholson', 'Daniel Day-Lewis', 'Katharine Hepburn', 'Meryl Streep'], correctIndex: 2, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
  { id: 'pc20', question: 'What was the first feature-length animated film by Disney?', options: ['Pinocchio', 'Snow White and the Seven Dwarfs', 'Fantasia', 'Bambi'], correctIndex: 1, category: 'Pop Culture', difficulty: 'hard', timeLimit: 25 },
]

export function getByCategory(category: Category): Question[] {
  return QUESTIONS.filter(q => q.category === category)
}

export function getByDifficulty(difficulty: Difficulty): Question[] {
  return QUESTIONS.filter(q => q.difficulty === difficulty)
}

export function getFiltered(categories: Category[], difficulty?: Difficulty): Question[] {
  return QUESTIONS.filter(q =>
    (categories.length === 0 || categories.includes(q.category)) &&
    (difficulty == null || q.difficulty === difficulty)
  )
}

export function pickRandom(pool: Question[]): Question {
  return pool[Math.floor(Math.random() * pool.length)]
}
