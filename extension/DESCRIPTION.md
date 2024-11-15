<b>Please consider supporting this project on:</b> <a href="https://www.patreon.com/ai_image_detector">Patreon</a> or <a href="https://ko-fi.com/ai_image_detector">Ko-fi</a>, any and all support is truly appreciated!

This extension enables you to analyze images and check if they are AI generated, all while you browse as normal. You can configure the extension to automatically check images as you navigate pages, or manually analyze an image using the right-click menu.

Additionally, you can report an image as real or artificial if the detector is initially wrong (or when its right, if you want to validate the result). If enough users have reported an image, the extension will skip the analysis and instead show you what the community has reported the image as, along with the number of reports.

As users report more and more images the detector will continue to learn from those reports and improve over time. You can opt-out of providing images for training while still reporting them; your report will still be recorded and shared with the community as usual, but the image will not be added to the detector's training data.

<b>Configurability</b>
The following configuration options are available:

<ul>
  <li>
    Toggle automatic image analysis
    <ul>
      <li>
        Individually toggle automatic analysis per site or globally
      </li>
      <li>
        A separate toggle for automatic analysis of private images
      </li>
      <li>
        Adjust the position of the indicator shown on top of the image once auto-analysis is complete
      </li>
    </ul>
  </li>
  <li>
    Toggle if an image will be uploaded to the detector's training data when you report it
    <ul>
      <li>
        <i>See the Privacy section for more info on how this data will be used</i>
      </li>
      <li>
        A separate toggle for uploading private images when reporting
      </li>
    </ul>
  </li>
</ul>

<b>How it works</b>
The process for analyzing an image is as follows:

<ol>
  <li>
    Check if the user has reported the image before. If so, show them their original report, otherwise move on to community reports.
  </li>
  <li>
    Check if the community has reported the image. If so show what the community has reported and how many reports have been submitted, otherwise move on analysis.
  </li>
  <li>
    Analyze the image using the detector's classification model. Show the model's percent certainty that the image is AI.
  </li>
</ol>

The detector's classification model is fine-tuned from Microsoft's Swin v2 vision transformer. It has been trained on a set of +100k images collected from various AI art/image social media pages. The model has been tested using an independent set of +10k images, with an accuracy of +96%. The model is continuously being trained on new images which will continue to improve its accuracy over time, but there will always be some misses. This is why the community feedback is so important!

<b>Data Privacy</b>
The AI Image Detector handles both usage and training data. Separate privacy policies are provided for each type of data:

<i>Usage Data</i>
The image data used during analysis is never store, and there are no logs kept of what images (including their URLs) a user has analyzed. Image data is only stored when a user reports an image and they have enabled the option for uploading reported images. The images reported by a user are tracked by their data signature and not the image itself. The data signature cannot be used to recreate the original image.

User emails are used only for sign in as a measure to prevent abuse, such as bulk mis-reporting images. User emails will never be shared with a third-party (excluding the cloud service providers that power the detector services). User accounts and reports are tracked using a signature generated from their email, which cannot be converted back into the original address. This is why all news and announcements for the AI Image Detector will be distributed via the extension itself or the project's <a href="https://github.com/haywoodsloan/ai-image-detector">GitHub page</a>.

<i>Training Data</i>
Access to the detector's training data will be granted at no cost to anyone, if they agree not to use it for training generative AI models. Classification models such as the one used by the detector are permitted however. This is to avoid inadvertently contributing to the the development of harder to detect AI image generators and the theft of real peoples' creative works/property. You can find the detector training data on <a href="https://huggingface.co/datasets/haywoodsloan/ai-images">Hugging Face</a>.

The images stored as training data are tracked using a different data signature than any reports that users may have made on that image. This ensures that the user reports cannot be correlated to any images in the training data. This provides an additional layer of privacy protection between users' usage data and the detectors training data.

<b>Open Source</b>
The AI Image Detector is fully open source. Feedback, contributions, and bug reporting and welcomed and encouraged.

<i>Contribute</i>
You can browse and contribute to the project here:

<ul>
  <li>
    <a href="https://github.com/haywoodsloan/ai-image-detector">GitHub: Extension, Services, and Model Training</a>
  </li>
  <li>
    <a href="https://huggingface.co/datasets/haywoodsloan/ai-images">Hugging Face: Training Data</a>
  </li>
  <li>
    <a href="https://huggingface.co/haywoodsloan/ai-image-detector-prod-deploy">Hugging Face: Classification Model</a>
  </li>
</ul>

<i>Feedback</i>
Please submit any feedback, requests, and bug reports to the <a href="https://github.com/haywoodsloan/ai-image-detector/issues/new">GitHub Issue Tracker</a>.
