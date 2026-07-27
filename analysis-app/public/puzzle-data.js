(function (root) {
  "use strict";
  const puzzles = [
  {
    "level": 1,
    "fen": "1R3ab2/2P1a2R1/3kb4/9/9/9/9/6n2/1r5r1/4K1p2 w - - 0 0"
  },
  {
    "level": 2,
    "fen": "4Rab2/3k5/4b4/9/9/1N7/9/9/4p1r2/5K3 w - - 0 0"
  },
  {
    "level": 3,
    "fen": "3k1ab2/R8/4c4/4N4/9/9/9/9/4p1r2/5K3 w - - 0 0"
  },
  {
    "level": 4,
    "fen": "3akab2/3N5/4b4/1R7/9/9/9/9/4p1r2/5K3 w - - 0 0"
  },
  {
    "level": 5,
    "fen": "4kab2/3ra4/4b4/1R5N1/9/9/9/9/4r4/5K3 w - - 0 0"
  },
  {
    "level": 6,
    "fen": "3aR4/3k4C/3ab4/7N1/9/9/9/2n6/3r1p3/4K4 w - - 0 0"
  },
  {
    "level": 7,
    "fen": "3k2b2/1R2c4/4b4/9/R8/9/9/4p4/3p1p3/4K4 w - - 0 0"
  },
  {
    "level": 8,
    "fen": "4ka3/4a4/4b1C2/9/6b2/9/9/3p5/4r4/3K2C2 w - - 0 0"
  },
  {
    "level": 9,
    "fen": "5a3/3k5/3a5/2C1n4/4C4/9/9/9/2r4r1/4K4 w - - 0 0"
  },
  {
    "level": 10,
    "fen": "3k1abC1/4n4/4b4/9/9/5R3/9/9/2r4r1/4K4 w - - 0 0"
  },
  {
    "level": 11,
    "fen": "2baka3/9/r3b4/9/9/3R5/9/1C3n3/4p4/3K5 w - - 0 0"
  },
  {
    "level": 12,
    "fen": "2ba1R3/4k4/4bNr2/7C1/9/9/9/5n3/4p4/3K5 w - - 0 0"
  },
  {
    "level": 13,
    "fen": "4Ra3/3k5/2ra5/2C2N3/9/9/9/9/3p1r3/4K4 w - - 0 0"
  },
  {
    "level": 14,
    "fen": "C1baka1P1/9/9/3n1N3/7R1/9/9/4n4/3p1r3/4K4 w - - 0 0"
  },
  {
    "level": 15,
    "fen": "2bk1a3/2P1a4/4b4/5N3/9/1R7/9/5K3/4r4/3n5 w - - 0 0"
  },
  {
    "level": 16,
    "fen": "9/3k5/4c3b/4N1R2/9/9/9/9/4r1p1c/5K3 w - - 0 0"
  },
  {
    "level": 17,
    "fen": "3ak4/8R/4b4/7N1/9/9/9/3n5/4r4/5K3 w - - 0 0"
  },
  {
    "level": 18,
    "fen": "2bk1a3/2R1a4/3Pb4/9/9/9/9/3rBK3/4r4/2n6 w - - 0 0"
  },
  {
    "level": 19,
    "fen": "3a5/4ak3/4N4/4R4/9/9/9/cr1AKA3/9/2n6 w - - 0 0"
  },
  {
    "level": 20,
    "fen": "3akab2/9/4b4/7N1/9/5R3/9/4B4/4r1p2/5K1c1 w - - 0 0"
  },
  {
    "level": 21,
    "fen": "RN1k1ab2/4a4/2P1b4/9/9/9/9/9/3r1p3/4K4 w - - 0 0"
  },
  {
    "level": 22,
    "fen": "5a3/3ka4/9/3N5/9/4R4/9/9/3p1p1r1/4K4 w - - 0 0"
  },
  {
    "level": 23,
    "fen": "5a3/3k5/2P6/9/6bN1/4R4/9/2n6/3p1p3/1c2K4 w - - 0 0"
  },
  {
    "level": 24,
    "fen": "2ba2b2/4k4/5a3/1R7/4N4/9/9/3n5/4r4/5K3 w - - 0 0"
  },
  {
    "level": 25,
    "fen": "C1bakab2/9/3ncc3/4p1R2/9/pN7/4p1n2/4CK3/4A2r1/2BA2B2 w - - 0 0"
  },
  {
    "level": 26,
    "fen": "3k5/4a4/3a5/N8/9/7R1/9/2n6/3r1p3/4K4 w - - 0 0"
  },
  {
    "level": 27,
    "fen": "1C2ka3/9/3a5/C3p4/2R6/9/4c4/6n2/3p1r3/3AKA3 w - - 0 0"
  },
  {
    "level": 28,
    "fen": "5a3/4k4/4ba1n1/9/4N4/4C1R2/9/3p5/2r1p4/3K5 w - - 0 0"
  },
  {
    "level": 29,
    "fen": "2bakaR2/9/9/8N/7R1/9/9/4p4/1r1p1p3/4K4 w - - 0 0"
  },
  {
    "level": 30,
    "fen": "9/5k2c/c5P1b/1r4N2/9/6n2/9/2n5R/3p5/4K3C w - - 0 0"
  },
  {
    "level": 31,
    "fen": "3ak4/4aP3/4n3b/6C2/6b2/7R1/9/9/2r1p4/3K5 w - - 0 0"
  },
  {
    "level": 32,
    "fen": "3a4r/1R5N1/4ka3/9/9/9/9/3n5/4p4/5K3 w - - 0 0"
  },
  {
    "level": 33,
    "fen": "2b2kb2/4a1r2/1c1a2N2/p8/9/3R5/P2n5/2N1C4/5C3/c1rAKA3 w - - 0 0"
  },
  {
    "level": 34,
    "fen": "2bak3C/4a1P2/9/7R1/9/5N3/9/4BC3/2p1rp3/3K1cp2 w - - 0 0"
  },
  {
    "level": 35,
    "fen": "C1baka3/3N2c2/4b4/3r5/4c4/1RP6/7n1/2C1B4/4A4/2B1KA3 w - - 0 0"
  },
  {
    "level": 36,
    "fen": "5a3/3ka4/2P6/9/9/6C2/9/5C3/3r1p3/4K4 w - - 0 0"
  },
  {
    "level": 37,
    "fen": "2bak3C/4ac3/r5N2/9/9/9/9/2n6/9/4KA3 w - - 0 0"
  },
  {
    "level": 38,
    "fen": "r3ka3/4aR1N1/9/9/4N1b2/9/9/2n6/5p3/4K4 w - - 0 0"
  },
  {
    "level": 39,
    "fen": "R4a3/3k5/3ab4/3P5/9/9/9/6n2/3p3r1/4K4 w - - 0 0"
  },
  {
    "level": 40,
    "fen": "5k3/9/9/9/5N1R1/9/6p2/4B4/5p3/4K1c1r w - - 0 0"
  },
  {
    "level": 41,
    "fen": "5a3/4k4/3N5/1R2p4/9/9/9/6n2/9/3AKAr1c w - - 0 0"
  },
  {
    "level": 42,
    "fen": "C3kab2/1R7/5an2/4N4/4p4/9/9/9/4p1r2/5K3 w - - 0 0"
  },
  {
    "level": 43,
    "fen": "1C3k3/1N2P4/1nN1b4/9/9/9/9/5p3/4p1p2/5K3 w - - 0 0"
  },
  {
    "level": 44,
    "fen": "9/9/3k5/4P4/9/9/9/9/2r2p3/2C1K4 w - - 0 0"
  },
  {
    "level": 45,
    "fen": "2b1k4/4aR3/c2ab4/1N7/9/9/9/4B4/4rp3/1C1K2c1r w - - 0 0"
  },
  {
    "level": 46,
    "fen": "3C1a1c1/9/C2kbN3/4P4/9/9/9/9/r4p3/4K4 w - - 0 0"
  },
  {
    "level": 47,
    "fen": "4R1b2/5k3/4b1r2/p1N5p/2p6/4CC3/P1ncP3P/5c3/3pAn3/2B1K4 w - - 0 0"
  },
  {
    "level": 48,
    "fen": "5a1nR/4a1P2/C4k3/9/8N/8r/9/4C4/3p1p3/4K4 w - - 0 0"
  },
  {
    "level": 49,
    "fen": "1C1NR4/1C2c3R/5k3/6n1N/8r/9/9/1r2n4/4pc3/3K5 w - - 0 0"
  },
  {
    "level": 50,
    "fen": "3a1kb2/4a1P1R/3n4b/6NCC/9/9/2R4r1/9/2nc1pp2/4K4 w - - 0 0"
  },
  {
    "level": 51,
    "fen": "2ba1k2C/4a3N/4b4/5P2p/9/8P/9/4cA3/1r3p3/3RKAB1c w - - 0 0"
  },
  {
    "level": 52,
    "fen": "2n6/8r/2rnk4/5PRC1/9/9/9/9/4p4/5K3 w - - 0 0"
  },
  {
    "level": 53,
    "fen": "5k2C/6N2/4b2n1/4p4/8N/9/8R/9/1c1p1p3/2n1K4 w - - 0 0"
  },
  {
    "level": 54,
    "fen": "4k4/2PR1P3/3n5/C8/N3r4/2R6/9/4p4/r2p1p3/4K4 w - - 0 0"
  },
  {
    "level": 55,
    "fen": "3k2b2/7RN/3r3N1/7C1/9/9/9/9/2np1p3/3AK4 w - - 0 0"
  },
  {
    "level": 56,
    "fen": "3ak4/2PR5/9/6N2/9/4p4/6R2/9/1r2r4/5K3 w - - 0 0"
  },
  {
    "level": 57,
    "fen": "4k1b2/3P5/4c1N2/4p4/9/9/9/4R3C/2rp1p3/4K4 w - - 0 0"
  },
  {
    "level": 58,
    "fen": "2r3b2/5k3/4N4/4p3C/9/6RC1/9/1n7/5r3/3K1A3 w - - 0 0"
  },
  {
    "level": 59,
    "fen": "4k2C1/5P3/3a1a3/8R/9/9/9/B2nB3C/3rp4/c4K3 w - - 0 0"
  },
  {
    "level": 60,
    "fen": "3a1kb2/4a4/4b2N1/4P4/9/9/9/8C/2r1p4/3K1C3 w - - 0 0"
  },
  {
    "level": 61,
    "fen": "4k1b2/4aPN2/5a3/6C2/2N3b2/9/4c4/5n3/4p4/5K3 w - - 0 0"
  },
  {
    "level": 62,
    "fen": "4kab2/4aPN2/4b4/3P3C1/9/9/9/3A1n3/2p6/1c1K1A3 w - - 0 0"
  },
  {
    "level": 63,
    "fen": "6b2/1N1Rak2C/5c3/9/9/R8/6p2/4B4/4Arn2/2BAK4 w - - 0 0"
  },
  {
    "level": 64,
    "fen": "5r3/C3k2c1/4b4/1RN6/6b2/6B2/9/4B4/4A1r2/3AK3c w - - 0 0"
  },
  {
    "level": 65,
    "fen": "4ka3/4a4/b1N1b4/3R5/9/2C6/2n6/4B3c/4r2r1/1R1K2B2 w - - 0 0"
  },
  {
    "level": 66,
    "fen": "3k2b2/4a1N2/3ab4/5R3/9/3R5/1r7/n3BC3/4r4/c2K2B2 w - - 0 0"
  },
  {
    "level": 67,
    "fen": "2bak4/4a4/5c1c1/1N3R2N/2p6/4R4/9/2nA5/3KA4/2r6 w - - 0 0"
  },
  {
    "level": 68,
    "fen": "9/5k3/r3b1R1n/4R1Nr1/9/1N7/9/3A5/2p1A4/3K4c w - - 0 0"
  },
  {
    "level": 69,
    "fen": "5ab2/3kaR3/4R3c/7N1/N8/9/9/4B1n2/1r2Ap1r1/3AK1B2 w - - 0 0"
  },
  {
    "level": 70,
    "fen": "3k1a3/2R1a4/b2n2R1b/7N1/9/3N5/9/9/3r1p3/c1BAKA1r1 w - - 0 0"
  },
  {
    "level": 71,
    "fen": "2bak4/4a4/4b4/N4CN1R/9/9/9/4n4/3pA1r2/CcBA1K3 w - - 0 0"
  },
  {
    "level": 72,
    "fen": "2bakab2/n5P2/9/1R7/4N4/1C7/9/3AB4/3p1p3/4KArc1 w - - 0 0"
  },
  {
    "level": 73,
    "fen": "2Rnkab2/4a2cC/4P3b/3N5/9/9/9/3p4r/1r2p4/2RK5 w - - 0 0"
  },
  {
    "level": 74,
    "fen": "4ka3/1r2a4/n3N4/9/4R1N2/9/9/9/5pc2/4K4 w - - 0 0"
  },
  {
    "level": 75,
    "fen": "3ak4/R3a1P1R/b3b4/C8/9/9/9/9/2r2pr2/c3K4 w - - 0 0"
  },
  {
    "level": 76,
    "fen": "3k2b1r/5R3/4b4/n2c1R3/9/1N7/9/4BA3/3r1p3/2BAK4 w - - 0 0"
  },
  {
    "level": 77,
    "fen": "c1b1kaP2/3Ra4/4c1P2/7R1/9/9/9/1C2B4/1r2p4/2BK5 w - - 0 0"
  },
  {
    "level": 78,
    "fen": "6b2/1N1R5/5k3/9/9/9/9/4p4/2Rp1p2r/4K4 w - - 0 0"
  },
  {
    "level": 79,
    "fen": "4k4/4a3R/4Pa3/7C1/4p4/9/9/2r6/4pr3/3K5 w - - 0 0"
  },
  {
    "level": 80,
    "fen": "2b1ka1r1/3Pa4/5Rc2/5Nr2/9/9/9/7C1/C2p5/4K4 w - - 0 0"
  },
  {
    "level": 81,
    "fen": "2C6/5k3/bP1Nn1R1n/9/6R2/9/5c3/3pB4/cr2p4/2BK5 w - - 0 0"
  },
  {
    "level": 82,
    "fen": "1P5n1/4ak1N1/5a1R1/1N2P4/1C3n3/9/1c7/3p5/r3p4/3K5 w - - 0 0"
  },
  {
    "level": 83,
    "fen": "3ak4/3NaRP2/9/9/9/9/9/9/1r1p1p2C/4K4 w - - 0 0"
  },
  {
    "level": 84,
    "fen": "5a1rr/3k5/2Pa5/1n7/9/5RC2/5RC2/9/3p1p3/2p1K4 w - - 0 0"
  },
  {
    "level": 85,
    "fen": "3a1k3/4anP2/9/9/9/R8/R8/8B/2nr1p1c1/C2AK1B2 w - - 0 0"
  },
  {
    "level": 86,
    "fen": "c2k1a3/4PP2r/2na5/9/9/9/8C/1R1A5/3r5/4K4 w - - 0 0"
  },
  {
    "level": 87,
    "fen": "c1bk1a3/RR2a2P1/b8/2N6/9/9/9/9/c1r2p3/4K4 w - - 0 0"
  },
  {
    "level": 88,
    "fen": "2ba5/4ak3/9/1CR1C4/9/2B6/9/4B4/r3r3c/3K2R2 w - - 0 0"
  },
  {
    "level": 89,
    "fen": "1RC1k4/3ra4/4b1c1N/7R1/9/9/9/5n3/4r4/5K3 w - - 0 0"
  },
  {
    "level": 90,
    "fen": "1C2k4/2P1a4/3a5/2R6/N8/9/9/8n/3pr1p2/5K2c w - - 0 0"
  },
  {
    "level": 91,
    "fen": "4k4/2R1a2n1/b8/4p1P2/9/8R/8C/8C/2np1p3/1cBAKA3 w - - 0 0"
  },
  {
    "level": 92,
    "fen": "3k5/2P1a3N/3c5/9/9/7R1/9/5c1C1/4p1p2/5K3 w - - 0 0"
  },
  {
    "level": 93,
    "fen": "4k4/4a1P2/5a3/9/9/9/9/B3p4/c2p1p2R/2B1K2R1 w - - 0 0"
  },
  {
    "level": 94,
    "fen": "R7R/3na1P2/4ka3/9/3nP4/5c3/9/9/4p1p2/5K3 w - - 0 0"
  },
  {
    "level": 95,
    "fen": "4kn3/2nPa2NC/9/9/9/9/3p5/9/2p1p4/3K2C2 w - - 0 0"
  },
  {
    "level": 96,
    "fen": "9/4a2N1/1P1k5/2N6/9/9/7Cc/4n3B/r2pA4/4KA3 w - - 0 0"
  },
  {
    "level": 97,
    "fen": "2b1kab2/5P3/3a4n/6R2/2P1p4/6B2/9/6C2/4p1pr1/1cBA1K3 w - - 0 0"
  },
  {
    "level": 98,
    "fen": "2ba2r2/3kn4/4b4/5R3/1n5N1/1N3C3/4c4/4B3B/2c1Ap3/3AK4 w - - 0 0"
  },
  {
    "level": 99,
    "fen": "3a5/4a4/4k4/5Pc2/4N4/6N2/9/3n5/4p1p2/5K3 w - - 0 0"
  },
  {
    "level": 100,
    "fen": "2b1ka3/3r4R/2N6/4p4/4c4/6C2/9/2n1B3R/3rAp3/2BAK4 w - - 0 0"
  },
  {
    "level": 101,
    "fen": "2Pak4/CR2a1P2/4b4/9/1C5R1/9/9/4cA3/2nr1p3/2rcKA3 w - - 0 0"
  },
  {
    "level": 102,
    "fen": "2Nk5/4P4/3n5/8C/9/9/5N3/3AB4/3p1pp2/4K3c w - - 0 0"
  },
  {
    "level": 103,
    "fen": "4R4/2Nk5/4bN3/9/2p6/9/9/n3C4/2rpA4/c3KA3 w - - 0 0"
  },
  {
    "level": 104,
    "fen": "3a1kb2/4a4/4b3n/3N2pN1/3r5/2R6/9/4BC1C1/2n1p1p2/c4K3 w - - 0 0"
  },
  {
    "level": 105,
    "fen": "3akc2N/4a4/4b1n2/C2RR4/1N2C4/5r3/9/3pn4/4p2r1/3K4c w - - 0 0"
  },
  {
    "level": 106,
    "fen": "3ak4/4a4/4cc3/1N1r2CRC/9/9/9/3n1R3/r3p4/3K5 w - - 0 0"
  },
  {
    "level": 107,
    "fen": "3k1a3/4a4/2n6/N2C1P3/9/C8/9/2pABcr1B/3pAp1n1/2c1K4 w - - 0 0"
  },
  {
    "level": 108,
    "fen": "1Cbaka3/1R7/2n1b4/2N1p4/9/3R5/4P1r2/4C3B/4Ar1n1/3AK3c w - - 0 0"
  },
  {
    "level": 109,
    "fen": "4k1br1/r3aPRN1/2Rab1P1n/8p/6P2/8C/9/9/3p1p3/4K4 w - - 0 0"
  },
  {
    "level": 110,
    "fen": "2b1kab2/5RP2/3a3P1/2N6/9/9/9/4C4/r3p4/3K1p3 w - - 0 0"
  }
];
  root.YMEGALODON_PUZZLES = Object.freeze(puzzles.map(Object.freeze));
})(typeof globalThis !== "undefined" ? globalThis : this);
