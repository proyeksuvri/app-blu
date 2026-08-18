import { Font } from "@react-pdf/renderer"

Font.register({
  family: "Geist",
  fonts: [
    { src: "/fonts/Geist-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Geist-Medium.ttf",  fontWeight: 500 },
    { src: "/fonts/Geist-SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/Geist-Bold.ttf",    fontWeight: 700 },
  ],
})
