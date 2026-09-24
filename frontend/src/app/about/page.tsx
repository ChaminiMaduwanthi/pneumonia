import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="container-wrap relative space-y-6 py-10">
        <div className="animate-in-up mb-2 text-center">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">About LungVision AI</h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            A simple online tool that helps you check a chest X-ray and understand the result.
          </p>
        </div>

        <Card>
        <CardHeader>
          <CardTitle>What LungVision AI Does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            Upload a chest X-ray and LungVision AI will tell you which of four results it most likely matches:
            COVID-19, Normal, Bacterial Pneumonia, or Viral Pneumonia.
          </p>
          <p>
            Along with the result you also get a confidence score that shows how sure the tool is, and a colour
            heatmap placed over your X-ray that highlights the areas of the lungs the result was based on.
          </p>
          <p>
            If an image you upload does not look like a proper chest X-ray, the tool will not show a diagnosis and
            will let you know the image could not be analysed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use It</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>1. Create an account or log in.</p>
          <p>2. Go to the Analyse page and upload a chest X-ray image.</p>
          <p>3. Start the analysis and wait a few seconds for your result.</p>
          <p>4. View your result, confidence score, and heatmap. You can save it as a PDF report.</p>
          <p>5. Find all your past scans any time on the History page.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disclaimer</CardTitle>
        </CardHeader>
        <CardContent>
          This project is intended for research, educational, and decision-support purposes only. It does not provide a
          medical diagnosis and must not replace assessment by a qualified healthcare professional.
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
