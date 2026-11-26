/** Hindi strings: Action cards, modes, plan items and schedule text. */
export const HI_ACTIONS = {
  // Action cards.
  "act.sealGaps.title": "दरवाज़ों और खिड़कियों की दरारें बंद करें",
  "act.sealGaps.cost": "₹300 से ₹800 की वेदर-स्ट्रिप",
  "act.sealGaps.detail":
    "दरारों पर टेप और वेदर-स्ट्रिप लगाएँ, और धुंध वाले घंटों में खिड़कियाँ बंद रखें। उन्हें केवल {hour} के आसपास खोलें।",
  "act.sealGaps.math1": "बाहर की PM2.5 का कितना हिस्सा अंदर आता है: {from} → {to}",
  "act.sealGaps.math2": "आज की खुराक का लगभग {pct}% हिस्सा घर के अंदर साँस में जाता है",
  "act.purifier.title": "जिस कमरे में सबसे ज़्यादा रहते हैं वहाँ एयर प्यूरीफायर चलाएँ",
  "act.purifier.cost": "₹8,000 से ₹15,000, या ₹2,000 का बॉक्स-फैन फ़िल्टर",
  "act.purifier.detail":
    "कमरे के आकार का HEPA यूनिट, दरवाज़ा बंद, जब आप घर पर हों तब चालू रखें। पहले बेडरूम में।",
  "act.purifier.math1": "अंदर का स्तर बाहर से आई हवा का {keep}% रखता है",
  "act.purifier.math2": "घर के अंदर का जोखिम आज की खुराक का {pct}% है, जो {cut}% घट जाता है",
  "act.mask.title": "बाहर हर बार N95 मास्क पहनें",
  "act.mask.cost": "₹60 से ₹120 प्रति मास्क",
  "act.mask.detail":
    "इसे नाक और ठुड्डी के चारों ओर कसकर लगाएँ। कपड़े और सर्जिकल मास्क PM2.5 को मुश्किल से रोकते हैं।",
  "act.mask.math1": "फ़िट के हिसाब से छानने की क्षमता: {n95}% (कपड़ा {cloth}%)",
  "act.mask.math2": "यह पैदल, साइकिल, दोपहिया और बस के सफ़र तथा बाहर खेलने पर लागू होता है",
  "act.shift.title": "परिवार का बाहर का समय {hour} पर रखें",
  "act.shift.cost": "मुफ़्त",
  "act.shift.detail":
    "आज हवा {best} के आसपास सबसे साफ़ है ({bestPm} µg/m³), {usual} पर नहीं ({usualPm} µg/m³)।",
  "act.shift.math1": "{usual} पर बाहर की PM2.5: {usualPm} → {best} पर: {bestPm} µg/m³",
  "act.shift.math2": "बाहर आधा घंटा, वही गतिविधि",
  "act.swap.titleSwitch": "अपना सफ़र {from} से {to} में बदलें",
  "act.swap.titleKeep": "अपना {from} वाला सफ़र जारी रखें",
  "act.swap.costSwitch": "कार से सस्ता",
  "act.swap.costKeep": "पहले से कम उत्सर्जन वाला विकल्प",
  "act.swap.detailSwitch":
    "बंद और साझा साधन से फेफड़ों में कम धुआँ जाता है और प्रति किमी {co2} ग्राम कम CO₂ निकलती है।",
  "act.swap.detailKeep": "यह पहले से सफ़र के सबसे साफ़ तरीकों में से एक है।",
  "act.swap.math1": "सफ़र के दौरान बाहरी हवा की तुलना में जोखिम: {from} → {to}",
  "act.swap.math2": "CO₂: {from} → {to} ग्राम प्रति यात्री-किमी, हर तरफ़ {km} किमी",
  "act.induction.title": "इंडक्शन पर पकाएँ, या पकाते समय हुड चलाएँ",
  "act.induction.cost": "सिंगल-प्लेट इंडक्शन ₹2,500 का",
  "act.induction.detail":
    "लकड़ी और गैस की लौ से रसोई में खाने के बाद भी देर तक धुआँ रहता है। इंडक्शन से लगभग कोई धुआँ नहीं होता।",
  "act.induction.math1": "पकाते समय घर के अंदर जुड़ने वाली PM2.5: +{from} → +{to} µg/m³",
  "act.induction.math2": "रोज़ दो घंटे पकाना",
  "mode.walk": "पैदल चलना",
  "mode.cycle": "साइकिल",
  "mode.bike": "दोपहिया",
  "mode.car": "कार",
  "mode.ev": "इलेक्ट्रिक कार",
  "mode.bus": "बस",
  "mode.metro": "मेट्रो",
  "planitem.sealGaps": "दरारें बंद करें",
  "planitem.purifier": "प्यूरीफायर चलाएँ",
  "planitem.n95": "बाहर N95 पहनें",
  "planitem.cloth": "कपड़े का मास्क पहनें",
  "planitem.shift": "बाहर का समय सबसे साफ़ घंटे में रखें",
  "planitem.swap": "सफ़र {mode} से करें",
  "planitem.induction": "इंडक्शन पर पकाएँ",
  "sched.morning.title": "खिड़कियाँ बंद रखें और प्यूरीफायर चालू करें",
  "sched.morning.detail":
    "बाहर PM2.5 {time} पर {at} है, यह ज़्यादा प्रदूषित घंटों में से एक है। {home} जिस कमरे में सबसे ज़्यादा रहते हैं, वहाँ प्यूरीफायर चलाएँ।",
  "sched.home.sealed": "आपका घर पहले से अच्छी तरह बंद है।",
  "sched.home.leaky": "दरारों को वेदर-स्ट्रिप से बंद करें।",
  "sched.cook.titleInduction": "हमेशा की तरह खाना बनाएँ",
  "sched.cook.titleSmoky": "कम धुएँ में खाना बनाएँ",
  "sched.cook.induction": "इंडक्शन से घर के अंदर लगभग धुआँ नहीं होता। फिर भी हुड चलाएँ।",
  "sched.cook.wood":
    "लकड़ी और कोयले का धुआँ घर के अंदर सबसे बड़ा स्रोत है। हो सके तो इंडक्शन अपनाएँ, और खाना बनाते समय रसोई में हवा आने दें।",
  "sched.cook.lpg":
    "गैस से रसोई में धुआँ रह जाता है। खाना बनाते समय चिमनी चलाएँ या चूल्हे के पास खिड़की थोड़ी खोलें, फिर बंद कर दें।",
  "sched.travel.title": "साफ़ तरीके से सफ़र करें ({mode})",
  "sched.travel.detail":
    "बाहर PM2.5 {time} पर {at} है। {tip} मेट्रो या साझा सवारी से प्रदूषण और उत्सर्जन दोनों घटते हैं।",
  "sched.travel.open": "पूरे सफ़र में ठीक से फिट होने वाला N95 पहनें।",
  "sched.travel.closed": "खिड़कियाँ बंद रखें और एसी को रीसर्कुलेट पर रखें।",
  "sched.best.title": "आपका सबसे साफ़ घंटा ({time})",
  "sched.best.detail":
    "बाहर PM2.5 {time} पर गिरकर {at} रह जाता है, जबकि {nowTime} पर यह {nowAt} है। सैर या खेल को इस समय में ले आएँ, और कुछ मिनट घर में हवा आने दें।{extra}",
  "sched.best.vulnerable": " बच्चे या बुज़ुर्ग के लिए इसे छोटा रखें।",
  "sched.back.title": "सुरक्षित होकर घर लौटें",
  "sched.back.detail": "बाहर PM2.5 {time} पर {at} है। {tip}",
  "sched.back.open": "घर लौटते समय N95 फिर से पहनें।",
  "sched.back.closed": "अपनी बंद सवारी में ही रहें।",
  "sched.evening.title": "दरवाज़ा बंद करके खाना बनाएँ और आराम करें",
  "sched.evening.detail":
    "बाहर PM2.5 {time} पर {at} है, जब शाम का धुआँ बढ़ता है। खिड़कियाँ बंद रखें और प्यूरीफायर चलने दें।",
  "sched.night.title": "प्यूरीफायर चालू करके सोएँ",
  "sched.night.detail":
    "बाहर PM2.5 {time} पर {at} है। शयनकक्ष का दरवाज़ा बंद करें और रात भर प्यूरीफायर चलने दें।",
} as const;
