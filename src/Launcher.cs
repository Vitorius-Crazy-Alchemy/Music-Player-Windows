// ==========================================================================
// Vitorius Music Player Pro - Native Windows Launcher (C#)
// Compiles with standard Windows csc.exe (zero SDK installation needed)
// ==========================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace VitoriusMusicPlayerPro
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlPath = Path.Combine(baseDir, "app", "index.html");
                
                if (!File.Exists(htmlPath))
                {
                    MessageBox.Show("Could not find app/index.html in:\n" + baseDir, 
                        "Vitorius Music Player Pro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // If launched with an audio file argument (File Association), pass it
                string fileArg = "";
                if (args.Length > 0 && File.Exists(args[0]))
                {
                    string filePathUri = new Uri(args[0]).AbsoluteUri;
                    fileArg = "?play=" + Uri.EscapeDataString(filePathUri);
                }

                string appUrl = new Uri(htmlPath).AbsoluteUri + fileArg;

                // Path to local portable user data
                string dataDir = Path.Combine(baseDir, "data", "profile");

                // Locate Microsoft Edge or Chrome for dedicated frameless app window
                string edgePath = FindBrowser();

                if (!string.IsNullOrEmpty(edgePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1240,820", appUrl, dataDir),
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = appUrl,
                        UseShellExecute = true
                    });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error starting Vitorius Music Player Pro:\n" + ex.Message,
                    "Vitorius Music Player Pro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static string FindBrowser()
        {
            string[] candidatePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string p in candidatePaths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }
    }
}
