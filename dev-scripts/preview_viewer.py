#!/usr/bin/env python3
"""Simple image preview viewer for testing"""

import tkinter as tk
from tkinter import ttk, messagebox
import requests
from PIL import Image, ImageTk
from io import BytesIO
import threading

class PreviewViewer:
    def __init__(self, root):
        self.root = root
        self.root.title("Znapfile Preview Viewer")
        self.root.geometry("800x600")
        
        # Create UI
        self.setup_ui()
        
    def setup_ui(self):
        # Top frame for controls
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(fill=tk.X)
        
        ttk.Label(control_frame, text="File Code:").pack(side=tk.LEFT, padx=5)
        self.code_entry = ttk.Entry(control_frame, width=20)
        self.code_entry.pack(side=tk.LEFT, padx=5)
        self.code_entry.insert(0, "8m9rql3Ycv")  # Default for testing
        
        ttk.Label(control_frame, text="Password:").pack(side=tk.LEFT, padx=5)
        self.password_entry = ttk.Entry(control_frame, width=20, show="*")
        self.password_entry.pack(side=tk.LEFT, padx=5)
        
        self.preview_btn = ttk.Button(control_frame, text="Preview", command=self.load_preview)
        self.preview_btn.pack(side=tk.LEFT, padx=5)
        
        # Status label
        self.status_label = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN)
        self.status_label.pack(fill=tk.X, side=tk.BOTTOM)
        
        # Image display area
        self.canvas = tk.Canvas(self.root, bg="gray")
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
    def load_preview(self):
        """Load and display preview"""
        code = self.code_entry.get().strip()
        password = self.password_entry.get().strip()
        
        if not code:
            messagebox.showwarning("Error", "Please enter a file code")
            return
        
        self.status_label.config(text="Loading preview...")
        self.preview_btn.config(state="disabled")
        
        # Load in background thread
        thread = threading.Thread(target=self._load_preview_thread, args=(code, password))
        thread.daemon = True
        thread.start()
        
    def _load_preview_thread(self, code, password):
        """Load preview in background thread"""
        try:
            # Build URL
            url = f"http://localhost:8000/api/v1/simple/preview/{code}"
            params = {}
            if password:
                params['password'] = password
            
            # Make request
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                # Load image
                img = Image.open(BytesIO(response.content))
                
                # Resize to fit canvas
                canvas_width = self.canvas.winfo_width()
                canvas_height = self.canvas.winfo_height()
                
                if canvas_width > 1 and canvas_height > 1:
                    img.thumbnail((canvas_width - 20, canvas_height - 20), Image.Resampling.LANCZOS)
                
                # Convert to PhotoImage
                photo = ImageTk.PhotoImage(img)
                
                # Update UI in main thread
                self.root.after(0, self._display_image, photo, f"Loaded: {response.headers.get('content-disposition', 'Unknown')}")
            else:
                error_msg = f"Error {response.status_code}: {response.text}"
                self.root.after(0, self._show_error, error_msg)
                
        except Exception as e:
            self.root.after(0, self._show_error, str(e))
            
    def _display_image(self, photo, status_text):
        """Display image on canvas (must be called from main thread)"""
        self.canvas.delete("all")
        
        # Center the image
        x = self.canvas.winfo_width() // 2
        y = self.canvas.winfo_height() // 2
        
        self.canvas.create_image(x, y, image=photo, anchor=tk.CENTER)
        self.canvas.image = photo  # Keep reference
        
        self.status_label.config(text=status_text)
        self.preview_btn.config(state="normal")
        
    def _show_error(self, error_msg):
        """Show error message (must be called from main thread)"""
        self.canvas.delete("all")
        self.canvas.create_text(
            self.canvas.winfo_width() // 2,
            self.canvas.winfo_height() // 2,
            text=error_msg,
            fill="red",
            font=("Arial", 12),
            width=400
        )
        self.status_label.config(text="Error loading preview")
        self.preview_btn.config(state="normal")

def main():
    root = tk.Tk()
    app = PreviewViewer(root)
    root.mainloop()

if __name__ == "__main__":
    main()