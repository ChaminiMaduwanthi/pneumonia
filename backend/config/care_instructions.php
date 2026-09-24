<?php

/**
 * Patient-facing care instructions shown after a scan and printed in the PDF report.
 *
 * These are GENERAL public-health instructions for the four conditions the system
 * screens for. They are not a treatment plan and never replace a clinician.
 *
 * Sources (general public guidance, not patient-specific advice):
 *   - CDC, COVID-19 emergency warning signs and "what to do if you are sick"
 *     https://www.cdc.gov/covid/signs-symptoms/index.html
 *   - CDC Respiratory Virus Guidance (1 Mar 2024): return to normal activities when,
 *     for >=24 h, symptoms are improving and there has been no fever without
 *     fever-reducing medicine; then 5 days of added precautions.
 *     https://www.cdc.gov/media/releases/2024/p0301-respiratory-virus.html
 *   - American Lung Association, Pneumonia treatment and recovery / preventing pneumonia
 *     https://www.lung.org/lung-health-diseases/lung-disease-lookup/pneumonia
 *   - WHO, Pneumonia fact sheet (vaccination, hand hygiene, nutrition, indoor air)
 *     https://www.who.int/news-room/fact-sheets/detail/pneumonia
 *
 * Keys are the English disease names stored in `scans.disease`, so this table is the
 * single source of truth for both report.php (PDF) and the JSON APIs.
 */

const CARE_INSTRUCTIONS = [
    "en" => [
        "_labels" => [
            "heading"   => "What To Do Next",
            "do"        => "Do",
            "dont"      => "Do not",
            "urgent"    => "Get emergency medical help immediately if",
            "footnote"  => "General guidance based on CDC, WHO and American Lung Association public health advice. It is not a diagnosis or a treatment plan — always follow the instructions of your own doctor.",
        ],
        "Bacterial Pneumonia" => [
            "intro" => "The scan suggests bacterial pneumonia. This type usually needs prescription antibiotics, so see a doctor as soon as you can.",
            "do" => [
                "See a doctor promptly to confirm the diagnosis and begin treatment.",
                "If antibiotics are prescribed, take every dose and finish the whole course, even after you start feeling better.",
                "Rest as much as possible — you may need to stay in bed for a while.",
                "Drink plenty of fluids to loosen mucus and make it easier to cough up.",
                "Ease your breathing with warm drinks, a steamy shower, or a humidifier.",
                "Use paracetamol or ibuprofen for fever and body aches, as directed on the label.",
                "Keep taking your regular medicines for asthma, COPD, diabetes or heart disease.",
            ],
            "dont" => [
                "Do not stop the antibiotics early — the infection can come back and become harder to treat.",
                "Do not smoke, and stay away from second-hand smoke and cooking or wood smoke while your lungs heal.",
                "Do not use cough-suppressant medicine without medical advice — coughing helps clear the infection.",
                "Do not go back to heavy work, sport or exercise until your breathing and energy have recovered.",
                "Do not share cups, utensils or towels, and avoid close contact with babies and elderly people while you are ill.",
            ],
            "urgent" => [
                "Breathing becomes difficult, fast or laboured",
                "Chest pain or pressure that does not go away",
                "New confusion, drowsiness, or difficulty staying awake",
                "Lips, face or nail beds turning pale, grey or blue",
                "Fever that keeps climbing, or returns after you had improved",
                "Coughing up blood",
                "You cannot keep fluids down, or you stop passing urine",
            ],
        ],
        "Viral Pneumonia" => [
            "intro" => "The scan suggests viral pneumonia. Antibiotics do not work against viruses, but a doctor still needs to confirm the cause and check whether a bacterial infection has developed on top of it.",
            "do" => [
                "See a doctor to confirm the cause and rule out a bacterial infection.",
                "Rest — recovery from pneumonia can take several weeks.",
                "Drink plenty of fluids to loosen mucus and stay hydrated.",
                "Ease your breathing with warm drinks, steam from a hot shower, or a humidifier.",
                "Use paracetamol or ibuprofen for fever and body aches, as directed on the label.",
                "Stay at home and away from other people while you have symptoms.",
                "Cover your mouth and nose when you cough or sneeze, and wash your hands often.",
            ],
            "dont" => [
                "Do not expect antibiotics to help — they do not work on viruses. Take them only if a doctor prescribes them for you.",
                "Do not smoke, and keep away from smoky air while your lungs heal.",
                "Do not suppress your cough with medicine unless a doctor advises it.",
                "Do not return to strenuous activity until your energy and breathing have recovered.",
                "Do not visit newborns, elderly or immunocompromised people while you still have symptoms.",
            ],
            "urgent" => [
                "Breathing becomes difficult, fast or laboured",
                "Chest pain or pressure that does not go away",
                "New confusion, drowsiness, or difficulty staying awake",
                "Lips, face or nail beds turning pale, grey or blue",
                "Fever that keeps climbing, or returns after you had improved",
                "Coughing up blood",
                "You cannot keep fluids down, or you stop passing urine",
            ],
        ],
        "COVID-19" => [
            "intro" => "The scan suggests changes that can occur with COVID-19. Confirm this with a test and a doctor. Antiviral treatment works best when it is started early, so do not delay if you are at higher risk.",
            "do" => [
                "Contact a doctor and take a confirmatory COVID-19 test.",
                "Tell your doctor straight away if you are older, pregnant, immunocompromised, or live with diabetes or chronic lung, heart, kidney or liver disease — early treatment matters most for you.",
                "Stay at home and away from other people, including those you live with, while you are ill.",
                "Return to normal activities only when, for at least 24 hours, your symptoms have been improving overall and you have had no fever without using fever-reducing medicine.",
                "For 5 days after you return, wear a mask, keep your distance, wash your hands and keep rooms well ventilated.",
                "Rest and drink plenty of fluids.",
                "Use paracetamol or ibuprofen for fever and body aches, as directed on the label.",
            ],
            "dont" => [
                "Do not take antibiotics or antivirals that were not prescribed for you.",
                "Do not smoke, and avoid second-hand smoke.",
                "Do not visit hospitals, care homes or vulnerable people while you have symptoms.",
                "Do not ignore worsening breathlessness just because your fever has settled.",
                "Do not return to heavy exercise until you have fully recovered.",
            ],
            "urgent" => [
                "Trouble breathing",
                "Persistent pain or pressure in the chest",
                "New confusion",
                "Inability to wake or stay awake",
                "Pale, grey or blue-coloured skin, lips or nail beds",
                "Fever that returns or keeps rising after you had improved",
            ],
        ],
        "Normal" => [
            "intro" => "This scan did not show signs of the conditions the system screens for. To keep your lungs healthy and lower your risk of pneumonia:",
            "do" => [
                "Keep your vaccinations up to date — pneumococcal, yearly influenza, COVID-19, and for children Hib, measles and whooping cough. Ask your doctor which ones apply to you.",
                "Wash your hands often with soap and water, especially after coughing, sneezing or blowing your nose, after using the toilet, and before preparing or eating food.",
                "Ventilate your home and reduce indoor smoke from cooking fires and stoves.",
                "Eat a balanced diet, sleep enough and exercise regularly to support your immune system.",
                "Keep conditions such as asthma, COPD, diabetes and heart disease well controlled.",
                "Cover your mouth and nose when you cough or sneeze, and clean frequently touched surfaces.",
                "See a doctor if a cough, fever or breathlessness lasts more than a few days or keeps getting worse.",
            ],
            "dont" => [
                "Do not smoke — smoking damages your lungs' ability to fight infection and raises your pneumonia risk. Avoid second-hand smoke too.",
                "Do not ignore a cough, fever or breathlessness that keeps getting worse, even after a normal result.",
                "Do not spend long periods in close contact with people who have an active chest infection when you can avoid it.",
                "Do not take antibiotics that were not prescribed for you.",
                "Do not treat this result as a full clean bill of health — this system only screens for four conditions on a chest X-ray.",
            ],
            "urgent" => [],
        ],
    ],

    "si" => [
        "_labels" => [
            "heading"  => "ඊළඟට කළ යුතු දේ",
            "do"       => "කළ යුතු දේ",
            "dont"     => "නොකළ යුතු දේ",
            "urgent"   => "පහත ලක්ෂණ ඇත්නම් වහාම හදිසි වෛද්‍ය ප්‍රතිකාර ලබා ගන්න",
            "footnote" => "මෙය CDC, WHO සහ American Lung Association යන ආයතනවල පොදු සෞඛ්‍ය මාර්ගෝපදේශ මත පදනම් වූ සාමාන්‍ය උපදෙස් වේ. මෙය රෝග විනිශ්චයක් හෝ ප්‍රතිකාර සැලැස්මක් නොවේ — සැමවිටම ඔබේ වෛද්‍යවරයාගේ උපදෙස් අනුගමනය කරන්න.",
        ],
        "Bacterial Pneumonia" => [
            "intro" => "මෙම පරීක්ෂණයෙන් බැක්ටීරියා නියුමෝනියාව යෝජනා වේ. මෙම වර්ගයට සාමාන්‍යයෙන් වෛද්‍ය නිර්දේශිත ප්‍රතිජීවක අවශ්‍ය වන බැවින්, හැකි ඉක්මනින් වෛද්‍යවරයෙකු හමුවන්න.",
            "do" => [
                "රෝග විනිශ්චය තහවුරු කර ප්‍රතිකාර ආරම්භ කිරීමට වහාම වෛද්‍යවරයෙකු හමුවන්න.",
                "ප්‍රතිජීවක නිර්දේශ කළහොත්, සුවය දැනුණත් සම්පූර්ණ මාත්‍රාව අවසන් වන තුරු ගන්න.",
                "හැකි තරම් විවේක ගන්න — යම් කාලයක් ඇඳේ සිටීමට සිදු විය හැක.",
                "ශ්ලේෂ්මය ලිහිල් කර පහසුවෙන් ඉවත් කිරීමට ජලය හා දියර බොහෝ සේ පානය කරන්න.",
                "උණුසුම් පාන, උණු වතුර ස්නානයේ වාෂ්පය හෝ humidifier එකකින් හුස්ම ගැනීම පහසු කරගන්න.",
                "උණ සහ ශරීර වේදනාවට ලේබලයේ උපදෙස් අනුව පැරසිටමෝල් හෝ ඉබුප්‍රොෆෙන් ගන්න.",
                "ඇදුම, COPD, දියවැඩියාව හෝ හෘද රෝග සඳහා ගන්නා නිතිපතා ඖෂධ දිගටම ගන්න.",
            ],
            "dont" => [
                "ප්‍රතිජීවක කලින් නවත්වන්න එපා — ආසාදනය නැවත ඇති වී ප්‍රතිකාර කිරීම අපහසු විය හැක.",
                "දුම් පානය නොකරන්න; පෙනහළු සුවවන තුරු අන් අයගේ දුම, ලිප් දුම හා දර දුමෙන් ඈත් වන්න.",
                "වෛද්‍ය උපදෙසකින් තොරව කැස්ස නවත්වන ඖෂධ ගන්න එපා — කැස්ස ආසාදනය ඉවත් කිරීමට උදව් වේ.",
                "හුස්ම ගැනීම හා ශක්තිය යථා තත්ත්වයට පත්වන තුරු බර වැඩ, ක්‍රීඩා හෝ ව්‍යායාම නොකරන්න.",
                "කෝප්ප, හැඳි හා තුවා බෙදා නොගන්න; රෝගී කාලයේ ළදරුවන් හා වැඩිහිටියන් සමඟ සමීප ඇසුරෙන් වළකින්න.",
            ],
            "urgent" => [
                "හුස්ම ගැනීම අපහසු වීම, වේගවත් වීම හෝ වෙහෙසකර වීම",
                "පපුවේ නොනැවතී පවතින වේදනාවක් හෝ පීඩනයක්",
                "අලුතින් ඇතිවන අවුල් සහගත බව, නිදිමත, හෝ අවදිව සිටීමට අපහසුව",
                "තොල්, මුහුණ හෝ නියපොතු සුදුමැලි, අළු හෝ නිල් පැහැ වීම",
                "උණ දිගටම වැඩිවීම, හෝ සුවය ලැබීමෙන් පසු නැවත ඇතිවීම",
                "කැස්සත් සමඟ ලේ ඒම",
                "දියර ශරීරයේ තබා ගත නොහැකි වීම, හෝ මුත්‍රා පිට නොවීම",
            ],
        ],
        "Viral Pneumonia" => [
            "intro" => "මෙම පරීක්ෂණයෙන් වෛරස් නියුමෝනියාව යෝජනා වේ. ප්‍රතිජීවක වෛරස්වලට ක්‍රියා නොකරයි, නමුත් හේතුව තහවුරු කිරීමට හා බැක්ටීරියා ආසාදනයක් එකතු වී තිබේද යන්න පරීක්ෂා කිරීමට වෛද්‍යවරයෙකු අවශ්‍යයි.",
            "do" => [
                "හේතුව තහවුරු කර බැක්ටීරියා ආසාදනයක් නොමැති බව සහතික කර ගැනීමට වෛද්‍යවරයෙකු හමුවන්න.",
                "විවේක ගන්න — නියුමෝනියාවෙන් සුවවීමට සති කිහිපයක් ගත විය හැක.",
                "ජලය හා දියර බොහෝ සේ පානය කරන්න.",
                "උණුසුම් පාන, උණු වතුර ස්නානයේ වාෂ්පය හෝ humidifier එකකින් හුස්ම ගැනීම පහසු කරගන්න.",
                "උණ සහ ශරීර වේදනාවට ලේබලයේ උපදෙස් අනුව පැරසිටමෝල් හෝ ඉබුප්‍රොෆෙන් ගන්න.",
                "රෝග ලක්ෂණ ඇති කාලයේ නිවසේ රැඳී අන් අයගෙන් ඈත් වන්න.",
                "කැස්සන විට හා කිවිසුම් යන විට මුඛය හා නාසය වසා ගන්න; නිතර අත් සෝදන්න.",
            ],
            "dont" => [
                "ප්‍රතිජීවකවලින් ප්‍රයෝජනයක් බලාපොරොත්තු නොවන්න — ඒවා වෛරස්වලට ක්‍රියා නොකරයි. වෛද්‍යවරයෙකු නිර්දේශ කළහොත් පමණක් ගන්න.",
                "දුම් පානය නොකරන්න; දුමාරමය වාතාවරණයෙන් ඈත් වන්න.",
                "වෛද්‍ය උපදෙසකින් තොරව කැස්ස නවත්වන ඖෂධ ගන්න එපා.",
                "ශක්තිය හා හුස්ම ගැනීම යථා තත්ත්වයට පත්වන තුරු වෙහෙසකර ක්‍රියාකාරකම් නොකරන්න.",
                "රෝග ලක්ෂණ ඇති කාලයේ අලුත උපන් දරුවන්, වැඩිහිටියන් හෝ ප්‍රතිශක්තිය අඩු අය බැලීමට නොයන්න.",
            ],
            "urgent" => [
                "හුස්ම ගැනීම අපහසු වීම, වේගවත් වීම හෝ වෙහෙසකර වීම",
                "පපුවේ නොනැවතී පවතින වේදනාවක් හෝ පීඩනයක්",
                "අලුතින් ඇතිවන අවුල් සහගත බව, නිදිමත, හෝ අවදිව සිටීමට අපහසුව",
                "තොල්, මුහුණ හෝ නියපොතු සුදුමැලි, අළු හෝ නිල් පැහැ වීම",
                "උණ දිගටම වැඩිවීම, හෝ සුවය ලැබීමෙන් පසු නැවත ඇතිවීම",
                "කැස්සත් සමඟ ලේ ඒම",
                "දියර ශරීරයේ තබා ගත නොහැකි වීම, හෝ මුත්‍රා පිට නොවීම",
            ],
        ],
        "COVID-19" => [
            "intro" => "මෙම පරීක්ෂණයෙන් කොවිඩ්-19 සමඟ ඇතිවිය හැකි වෙනස්කම් යෝජනා වේ. පරීක්ෂණයකින් හා වෛද්‍යවරයෙකුගෙන් තහවුරු කර ගන්න. ප්‍රති-වෛරස ප්‍රතිකාර කලින් ආරම්භ කළ විට වඩාත් ඵලදායී වේ.",
            "do" => [
                "වෛද්‍යවරයෙකු සම්බන්ධ කරගෙන කොවිඩ්-19 පරීක්ෂණයක් කරන්න.",
                "ඔබ වයස්ගත නම්, ගර්භනී නම්, ප්‍රතිශක්තිය අඩු නම්, හෝ දියවැඩියාව හෝ නිදන්ගත පෙනහළු, හෘද, වකුගඩු හෝ අක්මා රෝග ඇත්නම් වහාම වෛද්‍යවරයාට දන්වන්න — ඔබට කලින් ප්‍රතිකාර ගැනීම වඩාත් වැදගත්.",
                "රෝගී කාලයේ නිවසේ රැඳී, එකට ජීවත් වන අය ඇතුළු අන් අයගෙන් ඈත් වන්න.",
                "අවම වශයෙන් පැය 24ක් රෝග ලක්ෂණ අඩු වෙමින් තිබී, උණ අඩු කරන ඖෂධ නොගෙන උණ නොමැති නම් පමණක් සාමාන්‍ය කටයුතුවලට නැවත යන්න.",
                "නැවත ගිය පසු දින 5ක් මාස්ක් පැළඳීම, දුරස්ථභාවය, අත් සේදීම හා කාමර හොඳින් වාතාශ්‍රය ලබා දීම කරන්න.",
                "විවේක ගෙන ජලය හා දියර බොහෝ සේ පානය කරන්න.",
                "උණ සහ ශරීර වේදනාවට ලේබලයේ උපදෙස් අනුව පැරසිටමෝල් හෝ ඉබුප්‍රොෆෙන් ගන්න.",
            ],
            "dont" => [
                "ඔබට නිර්දේශ නොකළ ප්‍රතිජීවක හෝ ප්‍රති-වෛරස ඖෂධ ගන්න එපා.",
                "දුම් පානය නොකරන්න; අන් අයගේ දුමෙන් ඈත් වන්න.",
                "රෝග ලක්ෂණ ඇති කාලයේ රෝහල්, වැඩිහිටි නිවාස හෝ අවදානම් සහිත අය බැලීමට නොයන්න.",
                "උණ අඩු වූ පමණින් වැඩිවන හුස්ම හිරවීම නොසලකා හරින්න එපා.",
                "සම්පූර්ණයෙන් සුවවන තුරු බර ව්‍යායාමවලට නැවත නොයන්න.",
            ],
            "urgent" => [
                "හුස්ම ගැනීමේ අපහසුව",
                "පපුවේ නොනැවතී පවතින වේදනාවක් හෝ පීඩනයක්",
                "අලුතින් ඇතිවන අවුල් සහගත බව",
                "අවදි වීමට හෝ අවදිව සිටීමට නොහැකි වීම",
                "සම, තොල් හෝ නියපොතු සුදුමැලි, අළු හෝ නිල් පැහැ වීම",
                "සුවය ලැබීමෙන් පසු උණ නැවත ඒම හෝ දිගටම වැඩිවීම",
            ],
        ],
        "Normal" => [
            "intro" => "මෙම පරීක්ෂණයේදී පද්ධතිය පරීක්ෂා කරන රෝග තත්ත්වයන්ගේ ලක්ෂණ දක්නට නොලැබුණි. ඔබේ පෙනහළු නිරෝගීව තබා ගැනීමට හා නියුමෝනියා අවදානම අඩු කිරීමට:",
            "do" => [
                "එන්නත් යාවත්කාලීනව තබා ගන්න — නියුමොකොකල්, වාර්ෂික ඉන්ෆ්ලුවෙන්සා, කොවිඩ්-19, සහ දරුවන්ට Hib, සරම්ප හා කුකුල් කැස්ස. ඔබට අදාළ ඒවා වෛද්‍යවරයාගෙන් විමසන්න.",
                "සබන් හා ජලයෙන් නිතර අත් සෝදන්න — විශේෂයෙන් කැස්සීම, කිවිසුම් යාම, නාසය පිරිසිදු කිරීම, වැසිකිළි භාවිතය සහ ආහාර පිළියෙළ කිරීමට හෝ අනුභවයට පෙර.",
                "නිවසට හොඳ වාතාශ්‍රයක් ලබා දී ලිප් හා උදුන්වලින් ඇතිවන ගෘහස්ථ දුම අඩු කරන්න.",
                "සමබර ආහාර වේලක්, ප්‍රමාණවත් නින්දක් හා නිතිපතා ව්‍යායාම මගින් ප්‍රතිශක්තිය ශක්තිමත් කරගන්න.",
                "ඇදුම, COPD, දියවැඩියාව හා හෘද රෝග හොඳින් පාලනය කරගන්න.",
                "කැස්සන විට හා කිවිසුම් යන විට මුඛය හා නාසය වසා ගන්න; නිතර අල්ලන පෘෂ්ඨ පිරිසිදු කරන්න.",
                "කැස්ස, උණ හෝ හුස්ම හිරවීම දින කිහිපයකට වඩා පවතී නම් හෝ වැඩිවේ නම් වෛද්‍යවරයෙකු හමුවන්න.",
            ],
            "dont" => [
                "දුම් පානය නොකරන්න — දුම්පානය පෙනහළුවල ආසාදන මර්දන හැකියාව දුර්වල කර නියුමෝනියා අවදානම වැඩි කරයි. අන් අයගේ දුමෙන්ද ඈත් වන්න.",
                "සාමාන්‍ය ප්‍රතිඵලයක් ලැබුණත්, දිගටම වැඩිවන කැස්ස, උණ හෝ හුස්ම හිරවීම නොසලකා හරින්න එපා.",
                "පපුවේ ආසාදන ඇති අය සමඟ දිගු වේලාවක් සමීපව ගත කිරීමෙන් හැකි තරම් වළකින්න.",
                "ඔබට නිර්දේශ නොකළ ප්‍රතිජීවක ගන්න එපා.",
                "මෙය සම්පූර්ණ නිරෝගී බවක් ලෙස නොසලකන්න — මෙම පද්ධතිය පපුවේ එක්ස් කිරණයකින් රෝග තත්ත්ව හතරක් පමණක් පරීක්ෂා කරයි.",
            ],
            "urgent" => [],
        ],
    ],

    "ta" => [
        "_labels" => [
            "heading"  => "அடுத்து என்ன செய்ய வேண்டும்",
            "do"       => "செய்ய வேண்டியவை",
            "dont"     => "செய்யக் கூடாதவை",
            "urgent"   => "பின்வரும் அறிகுறிகள் இருந்தால் உடனடியாக அவசர மருத்துவ உதவி பெறவும்",
            "footnote" => "இவை CDC, WHO மற்றும் American Lung Association ஆகியவற்றின் பொது சுகாதார வழிகாட்டுதல்களை அடிப்படையாகக் கொண்ட பொதுவான ஆலோசனைகள். இது நோயறிதலோ சிகிச்சைத் திட்டமோ அல்ல — எப்போதும் உங்கள் மருத்துவரின் அறிவுரையைப் பின்பற்றவும்.",
        ],
        "Bacterial Pneumonia" => [
            "intro" => "இந்த ஸ்கேன் பாக்டீரியா நிமோனியாவைக் குறிக்கிறது. இதற்கு பொதுவாக மருத்துவர் பரிந்துரைக்கும் நுண்ணுயிர்க் கொல்லிகள் தேவை, எனவே கூடிய விரைவில் மருத்துவரை அணுகவும்.",
            "do" => [
                "நோயறிதலை உறுதிப்படுத்தி சிகிச்சையைத் தொடங்க உடனடியாக மருத்துவரை அணுகவும்.",
                "நுண்ணுயிர்க் கொல்லிகள் பரிந்துரைக்கப்பட்டால், நலம் தெரிந்தாலும் முழு மருந்துப் படிப்பையும் முடிக்கவும்.",
                "முடிந்தவரை ஓய்வெடுங்கள் — சிறிது காலம் படுக்கையில் இருக்க வேண்டியிருக்கலாம்.",
                "சளியை இளக்கி வெளியேற்ற நிறைய நீர் மற்றும் திரவங்களைக் குடிக்கவும்.",
                "சூடான பானங்கள், வெந்நீர் குளியல் நீராவி அல்லது humidifier மூலம் சுவாசத்தை எளிதாக்கவும்.",
                "காய்ச்சல் மற்றும் உடல் வலிக்கு லேபிளில் உள்ள அறிவுரைப்படி பாராசிட்டமால் அல்லது இப்யூபுரூஃபன் எடுக்கவும்.",
                "ஆஸ்துமா, COPD, நீரிழிவு அல்லது இதய நோய்க்கான வழக்கமான மருந்துகளைத் தொடர்ந்து எடுக்கவும்.",
            ],
            "dont" => [
                "நுண்ணுயிர்க் கொல்லிகளை முன்கூட்டியே நிறுத்த வேண்டாம் — தொற்று மீண்டும் வந்து சிகிச்சை கடினமாகலாம்.",
                "புகைபிடிக்க வேண்டாம்; நுரையீரல் குணமாகும் வரை மற்றவர்களின் புகை, அடுப்புப் புகை மற்றும் விறகுப் புகையிலிருந்து விலகி இருங்கள்.",
                "மருத்துவ ஆலோசனையின்றி இருமலை அடக்கும் மருந்துகளை எடுக்க வேண்டாம் — இருமல் தொற்றை வெளியேற்ற உதவுகிறது.",
                "சுவாசமும் சக்தியும் மீளும் வரை கடின வேலை, விளையாட்டு அல்லது உடற்பயிற்சி செய்ய வேண்டாம்.",
                "கோப்பைகள், கரண்டிகள், துண்டுகளைப் பகிர வேண்டாம்; நோயுற்ற காலத்தில் குழந்தைகள், முதியவர்களுடன் நெருங்கிப் பழக வேண்டாம்.",
            ],
            "urgent" => [
                "சுவாசம் கடினமாகுதல், வேகமாகுதல் அல்லது சிரமமாகுதல்",
                "நீங்காத மார்பு வலி அல்லது அழுத்தம்",
                "புதிதாக ஏற்படும் குழப்பம், தூக்கக் கலக்கம், அல்லது விழித்திருக்க இயலாமை",
                "உதடுகள், முகம் அல்லது நகங்கள் வெளிர், சாம்பல் அல்லது நீல நிறமாதல்",
                "காய்ச்சல் தொடர்ந்து அதிகரித்தல், அல்லது குணமான பிறகு மீண்டும் வருதல்",
                "இருமலுடன் இரத்தம் வெளியேறுதல்",
                "திரவங்களை உட்கொள்ள இயலாமை, அல்லது சிறுநீர் வெளியேறாமை",
            ],
        ],
        "Viral Pneumonia" => [
            "intro" => "இந்த ஸ்கேன் வைரஸ் நிமோனியாவைக் குறிக்கிறது. நுண்ணுயிர்க் கொல்லிகள் வைரஸ்களுக்கு வேலை செய்யாது, ஆனால் காரணத்தை உறுதிப்படுத்தவும் பாக்டீரியா தொற்று சேர்ந்துள்ளதா எனப் பார்க்கவும் மருத்துவர் தேவை.",
            "do" => [
                "காரணத்தை உறுதிப்படுத்தவும் பாக்டீரியா தொற்றை நிராகரிக்கவும் மருத்துவரை அணுகவும்.",
                "ஓய்வெடுங்கள் — நிமோனியாவிலிருந்து குணமாக பல வாரங்கள் ஆகலாம்.",
                "நிறைய நீர் மற்றும் திரவங்களைக் குடிக்கவும்.",
                "சூடான பானங்கள், வெந்நீர் குளியல் நீராவி அல்லது humidifier மூலம் சுவாசத்தை எளிதாக்கவும்.",
                "காய்ச்சல் மற்றும் உடல் வலிக்கு லேபிளில் உள்ள அறிவுரைப்படி பாராசிட்டமால் அல்லது இப்யூபுரூஃபன் எடுக்கவும்.",
                "அறிகுறிகள் உள்ள வரை வீட்டில் இருந்து மற்றவர்களிடமிருந்து விலகி இருங்கள்.",
                "இருமும்போதும் தும்மும்போதும் வாய், மூக்கை மூடிக் கொள்ளுங்கள்; அடிக்கடி கை கழுவுங்கள்.",
            ],
            "dont" => [
                "நுண்ணுயிர்க் கொல்லிகள் உதவும் என எதிர்பார்க்க வேண்டாம் — அவை வைரஸ்களுக்கு வேலை செய்யாது. மருத்துவர் பரிந்துரைத்தால் மட்டுமே எடுக்கவும்.",
                "புகைபிடிக்க வேண்டாம்; புகை நிறைந்த சூழலிலிருந்து விலகி இருங்கள்.",
                "மருத்துவ ஆலோசனையின்றி இருமலை அடக்கும் மருந்துகளை எடுக்க வேண்டாம்.",
                "சக்தியும் சுவாசமும் மீளும் வரை கடினமான செயல்களைச் செய்ய வேண்டாம்.",
                "அறிகுறிகள் உள்ள வரை பிறந்த குழந்தைகள், முதியவர்கள் அல்லது நோய் எதிர்ப்பாற்றல் குறைந்தவர்களைப் பார்க்கச் செல்ல வேண்டாம்.",
            ],
            "urgent" => [
                "சுவாசம் கடினமாகுதல், வேகமாகுதல் அல்லது சிரமமாகுதல்",
                "நீங்காத மார்பு வலி அல்லது அழுத்தம்",
                "புதிதாக ஏற்படும் குழப்பம், தூக்கக் கலக்கம், அல்லது விழித்திருக்க இயலாமை",
                "உதடுகள், முகம் அல்லது நகங்கள் வெளிர், சாம்பல் அல்லது நீல நிறமாதல்",
                "காய்ச்சல் தொடர்ந்து அதிகரித்தல், அல்லது குணமான பிறகு மீண்டும் வருதல்",
                "இருமலுடன் இரத்தம் வெளியேறுதல்",
                "திரவங்களை உட்கொள்ள இயலாமை, அல்லது சிறுநீர் வெளியேறாமை",
            ],
        ],
        "COVID-19" => [
            "intro" => "இந்த ஸ்கேன் கோவிட்-19 உடன் ஏற்படக்கூடிய மாற்றங்களைக் குறிக்கிறது. பரிசோதனை மூலமும் மருத்துவர் மூலமும் உறுதிப்படுத்தவும். வைரஸ் எதிர்ப்பு சிகிச்சை முன்கூட்டியே தொடங்கினால் சிறப்பாக வேலை செய்யும்.",
            "do" => [
                "மருத்துவரைத் தொடர்பு கொண்டு கோவிட்-19 உறுதிப்படுத்தும் பரிசோதனை செய்யவும்.",
                "நீங்கள் வயதானவரா, கர்ப்பிணியா, நோய் எதிர்ப்பாற்றல் குறைந்தவரா, அல்லது நீரிழிவு அல்லது நாள்பட்ட நுரையீரல், இதயம், சிறுநீரகம், கல்லீரல் நோய் உள்ளவரா என்பதை மருத்துவரிடம் உடனே தெரிவிக்கவும் — உங்களுக்கு முன்கூட்டிய சிகிச்சை மிக முக்கியம்.",
                "நோயுற்ற காலத்தில் வீட்டில் இருந்து, உடன் வசிப்பவர்கள் உட்பட மற்றவர்களிடமிருந்து விலகி இருங்கள்.",
                "குறைந்தது 24 மணி நேரம் அறிகுறிகள் மேம்பட்டு, காய்ச்சல் குறைக்கும் மருந்து இல்லாமல் காய்ச்சல் இல்லாத நிலையில் மட்டுமே வழக்கமான செயல்களுக்குத் திரும்பவும்.",
                "திரும்பிய பிறகு 5 நாட்களுக்கு முககவசம், இடைவெளி, கை கழுவுதல் மற்றும் நல்ல காற்றோட்டத்தைப் பேணவும்.",
                "ஓய்வெடுத்து நிறைய நீர் மற்றும் திரவங்களைக் குடிக்கவும்.",
                "காய்ச்சல் மற்றும் உடல் வலிக்கு லேபிளில் உள்ள அறிவுரைப்படி பாராசிட்டமால் அல்லது இப்யூபுரூஃபன் எடுக்கவும்.",
            ],
            "dont" => [
                "உங்களுக்குப் பரிந்துரைக்கப்படாத நுண்ணுயிர்க் கொல்லிகளையோ வைரஸ் எதிர்ப்பு மருந்துகளையோ எடுக்க வேண்டாம்.",
                "புகைபிடிக்க வேண்டாம்; மற்றவர்களின் புகையிலிருந்தும் விலகி இருங்கள்.",
                "அறிகுறிகள் உள்ள வரை மருத்துவமனைகள், முதியோர் இல்லங்கள் அல்லது பாதிக்கப்படக்கூடியவர்களைப் பார்க்கச் செல்ல வேண்டாம்.",
                "காய்ச்சல் குறைந்துவிட்டது என்பதற்காக அதிகரிக்கும் மூச்சுத் திணறலைப் புறக்கணிக்க வேண்டாம்.",
                "முழுமையாகக் குணமாகும் வரை கடினமான உடற்பயிற்சிக்குத் திரும்ப வேண்டாம்.",
            ],
            "urgent" => [
                "சுவாசிப்பதில் சிரமம்",
                "நீங்காத மார்பு வலி அல்லது அழுத்தம்",
                "புதிதாக ஏற்படும் குழப்பம்",
                "விழிக்க இயலாமை அல்லது விழித்திருக்க இயலாமை",
                "தோல், உதடுகள் அல்லது நகங்கள் வெளிர், சாம்பல் அல்லது நீல நிறமாதல்",
                "குணமான பிறகு காய்ச்சல் மீண்டும் வருதல் அல்லது தொடர்ந்து அதிகரித்தல்",
            ],
        ],
        "Normal" => [
            "intro" => "இந்த ஸ்கேனில் இந்த அமைப்பு பரிசோதிக்கும் நோய் நிலைகளின் அறிகுறிகள் காணப்படவில்லை. உங்கள் நுரையீரலை ஆரோக்கியமாக வைத்திருக்கவும் நிமோனியா அபாயத்தைக் குறைக்கவும்:",
            "do" => [
                "தடுப்பூசிகளைப் புதுப்பித்து வைத்திருங்கள் — நிமோகோகல், ஆண்டுதோறும் இன்ஃப்ளூயன்சா, கோவிட்-19, மற்றும் குழந்தைகளுக்கு Hib, தட்டம்மை, கக்குவான் இருமல். உங்களுக்குப் பொருந்துபவை குறித்து மருத்துவரிடம் கேளுங்கள்.",
                "சோப்பும் நீரும் கொண்டு அடிக்கடி கை கழுவுங்கள் — குறிப்பாக இருமல், தும்மல், மூக்கு சிந்திய பிறகு, கழிப்பறை பயன்பாட்டுக்குப் பிறகு, உணவு தயாரிக்கும் அல்லது உண்ணும் முன்.",
                "வீட்டில் நல்ல காற்றோட்டத்தை ஏற்படுத்தி அடுப்புப் புகையைக் குறைக்கவும்.",
                "சமச்சீர் உணவு, போதுமான தூக்கம், வழக்கமான உடற்பயிற்சி மூலம் நோய் எதிர்ப்பாற்றலை வலுப்படுத்துங்கள்.",
                "ஆஸ்துமா, COPD, நீரிழிவு, இதய நோய் ஆகியவற்றை நன்கு கட்டுப்பாட்டில் வைத்திருங்கள்.",
                "இருமும்போதும் தும்மும்போதும் வாய், மூக்கை மூடுங்கள்; அடிக்கடி தொடும் மேற்பரப்புகளைச் சுத்தம் செய்யுங்கள்.",
                "இருமல், காய்ச்சல் அல்லது மூச்சுத் திணறல் சில நாட்களுக்கு மேல் நீடித்தால் அல்லது மோசமானால் மருத்துவரை அணுகவும்.",
            ],
            "dont" => [
                "புகைபிடிக்க வேண்டாம் — புகைத்தல் நுரையீரலின் தொற்று எதிர்ப்புத் திறனைப் பாதித்து நிமோனியா அபாயத்தை அதிகரிக்கிறது. மற்றவர்களின் புகையையும் தவிர்க்கவும்.",
                "சாதாரண முடிவு வந்தாலும், மோசமாகிக் கொண்டே இருக்கும் இருமல், காய்ச்சல் அல்லது மூச்சுத் திணறலைப் புறக்கணிக்க வேண்டாம்.",
                "மார்புத் தொற்று உள்ளவர்களுடன் நீண்ட நேரம் நெருங்கிப் பழகுவதை முடிந்தவரை தவிர்க்கவும்.",
                "உங்களுக்குப் பரிந்துரைக்கப்படாத நுண்ணுயிர்க் கொல்லிகளை எடுக்க வேண்டாம்.",
                "இதை முழுமையான ஆரோக்கியச் சான்றாகக் கருத வேண்டாம் — இந்த அமைப்பு மார்பு எக்ஸ்-ரேயில் நான்கு நிலைகளை மட்டுமே பரிசோதிக்கிறது.",
            ],
            "urgent" => [],
        ],
    ],
];

/**
 * Instructions for a disease name as stored in `scans.disease`.
 *
 * Returns null when there is nothing sensible to show — an unknown disease, or a
 * scan whose diagnosis was withheld (out-of-distribution input), where offering
 * condition-specific advice would be misleading.
 */
function careInstructionsFor(?string $disease, string $lang = "en", bool $isOod = false): ?array
{
    if ($isOod || $disease === null || $disease === "") {
        return null;
    }
    $lang = isset(CARE_INSTRUCTIONS[$lang]) ? $lang : "en";
    $table = CARE_INSTRUCTIONS[$lang];
    if (!isset($table[$disease])) {
        return null;
    }
    return $table[$disease] + ["labels" => $table["_labels"]];
}
