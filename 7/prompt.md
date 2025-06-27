I made some adjustments. note key and grid sizes

/* ----------- COLOR VARIABLES ------------------------------------------ */
:root{
  --white-key:#fff;
  --black-key:#111;
  --active:   #228b22;          /* forest-green “on” cells              */
}

/* ----------- LAYOUT BASICS -------------------------------------------- */
body{
  margin:0; padding:1rem; background:#222; color:#ddd;
  font-family:system-ui,sans-serif; user-select:none; text-align:center;
}
table{ border-collapse:collapse; margin-inline:auto; }
td   { padding:0; text-align:center; }

/* ----------- PIANO LABEL ROWS ----------------------------------------- */
.octave{ font-size:1.5rem; font-weight:700; }
.note  { font-size:.9rem; }

/* ----------- KEYS ------------------------------------------------------ */
.key{
  width:25px; height:150px;
  border:1px solid #444; border-radius:4px;
  display:inline-block; cursor:pointer;
}
  .white{ background:var(--white-key); }
  .black{ background:var(--black-key); color:#eee; }
  .held { filter:brightness(75%); }

/* ----------- SEQUENCER GRID ------------------------------------------- */
.seq td{
  width:26px; height:26px;
  background:#333; border:1px solid #555; cursor:pointer;
}
.seq .on{ background:var(--active); }