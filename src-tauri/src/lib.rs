#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            use tauri::Manager;
            use tauri_plugin_shell::ShellExt;

            #[cfg(not(debug_assertions))]
            {
                let resource_dir = app
                    .path()
                    .resource_dir()
                    .expect("Failed to get resource dir");
                    
                let mut server_js_path = resource_dir.join("backend").join("dist").join("server.js");
                if !server_js_path.exists() {
                    server_js_path = resource_dir.join("_up_").join("backend").join("dist").join("server.js");
                }

                let sidecar_command = app
                    .shell()
                    .sidecar("node")
                    .expect("Failed to create sidecar command")
                    .arg(server_js_path.to_str().unwrap());

                let (mut rx, _child) = sidecar_command.spawn().expect("Failed to spawn sidecar");

                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        println!("Backend: {:?}", event);
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
